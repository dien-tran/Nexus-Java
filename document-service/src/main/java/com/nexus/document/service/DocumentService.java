package com.nexus.document.service;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import com.nexus.common.event.DocumentUploadedEvent;
import com.nexus.document.config.DocumentUploadProperties;
import com.nexus.document.constant.DocumentStatus;
import com.nexus.document.constant.ProcessingStatus;
import com.nexus.document.dto.request.InitDocumentUploadRequest;
import com.nexus.document.dto.response.DocumentResponse;
import com.nexus.document.dto.response.DownloadUrlResponse;
import com.nexus.document.dto.response.InitDocumentUploadResponse;
import com.nexus.document.entity.Document;
import com.nexus.document.exception.AppException;
import com.nexus.document.exception.ErrorCode;
import com.nexus.document.kafka.DocumentEventProducer;
import com.nexus.document.repository.DocumentRepository;
import com.nexus.document.storage.R2ObjectMetadata;
import com.nexus.document.storage.R2StorageService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DocumentService {

    DocumentRepository documentRepository;
    R2StorageService r2StorageService;
    DocumentUploadProperties uploadProperties;
    DocumentEventProducer documentEventProducer;

    @Transactional
    public InitDocumentUploadResponse initUpload(String ownerId, InitDocumentUploadRequest request) {
        validateUploadRequest(request);

        String checksum = request.getChecksumSha256().toLowerCase(Locale.ROOT);
        boolean duplicated = documentRepository.existsByOwnerIdAndChecksumSha256AndStatusNot(
                ownerId, checksum, DocumentStatus.DELETED);
        if (duplicated) {
            throw new AppException(ErrorCode.DOCUMENT_DUPLICATED);
        }

        Instant now = Instant.now();
        String documentId = UUID.randomUUID().toString();
        String extension = extensionOf(request.getOriginalFilename());
        String storageKey = "documents/%s/%s/original.%s".formatted(ownerId, documentId, extension);

        var uploadUrl = r2StorageService.createUploadUrl(storageKey, request.getContentType(), request.getSizeBytes());

        Document document = new Document();
        document.setId(documentId);
        document.setOwnerId(ownerId);
        document.setFileName(safeFileName(request.getOriginalFilename()));
        document.setOriginalFileName(safeFileName(request.getOriginalFilename()));
        document.setMimeType(request.getContentType());
        document.setFileExtension(extension);
        document.setFileSize(request.getSizeBytes());
        document.setStorageProvider("r2");
        document.setStorageBucket(r2StorageService.bucket());
        document.setStorageKey(storageKey);
        document.setChecksumSha256(checksum);
        document.setStatus(DocumentStatus.PENDING_UPLOAD);
        document.setParseStatus(ProcessingStatus.PENDING);
        document.setIndexStatus(ProcessingStatus.PENDING);
        document.setUploadUrlExpiresAt(uploadUrl.expiresAt());
        document.setCreatedAt(now);
        document.setUpdatedAt(now);

        documentRepository.save(document);

        return InitDocumentUploadResponse.builder()
                .document(toResponse(document))
                .uploadUrl(uploadUrl.url())
                .method("PUT")
                .expiresAt(uploadUrl.expiresAt())
                .build();
    }

    @Transactional
    public DocumentResponse completeUpload(String ownerId, String documentId) {
        Document document = getOwnedDocument(ownerId, documentId);
        if (document.getStatus() != DocumentStatus.PENDING_UPLOAD) {
            throw new AppException(ErrorCode.UPLOAD_NOT_PENDING);
        }

        R2ObjectMetadata objectMetadata = r2StorageService.headObject(document.getStorageKey());
        if (objectMetadata.sizeBytes() != null && !objectMetadata.sizeBytes().equals(document.getFileSize())) {
            throw new AppException(ErrorCode.R2_OBJECT_MISMATCH);
        }

        Instant now = Instant.now();
        document.setStatus(DocumentStatus.UPLOADED);
        document.setUploadedAt(now);
        document.setUpdatedAt(now);
        documentRepository.save(document);

        documentEventProducer.publishDocumentUploaded(DocumentUploadedEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .documentId(document.getId())
                .ownerId(document.getOwnerId())
                .storageProvider(document.getStorageProvider())
                .storageBucket(document.getStorageBucket())
                .storageKey(document.getStorageKey())
                .originalFileName(document.getOriginalFileName())
                .mimeType(document.getMimeType())
                .fileSize(document.getFileSize())
                .checksumSha256(document.getChecksumSha256())
                .occurredAt(now)
                .build());

        return toResponse(document);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> getDocuments(String ownerId) {
        return documentRepository.findByOwnerIdAndStatusNotOrderByCreatedAtDesc(ownerId, DocumentStatus.DELETED)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentResponse getDocument(String ownerId, String documentId) {
        return toResponse(getOwnedDocument(ownerId, documentId));
    }

    @Transactional(readOnly = true)
    public DownloadUrlResponse getDownloadUrl(String ownerId, String documentId, String disposition) {
        Document document = getOwnedDocument(ownerId, documentId);
        if (document.getStatus() != DocumentStatus.UPLOADED && document.getStatus() != DocumentStatus.READY) {
            throw new AppException(ErrorCode.DOCUMENT_NOT_READY);
        }

        var downloadUrl = r2StorageService.createDownloadUrl(
                document.getStorageKey(),
                document.getOriginalFileName(),
                document.getMimeType(),
                disposition);

        return DownloadUrlResponse.builder()
                .documentId(document.getId())
                .url(downloadUrl.url())
                .method("GET")
                .expiresAt(downloadUrl.expiresAt())
                .contentType(document.getMimeType())
                .fileName(document.getOriginalFileName())
                .build();
    }

    @Transactional
    public void deleteDocument(String ownerId, String documentId) {
        Document document = getOwnedDocument(ownerId, documentId);
        Instant now = Instant.now();
        document.setStatus(DocumentStatus.DELETED);
        document.setDeletedAt(now);
        document.setUpdatedAt(now);
        documentRepository.save(document);
    }

    private Document getOwnedDocument(String ownerId, String documentId) {
        return documentRepository.findByIdAndOwnerId(documentId, ownerId)
                .orElseThrow(() -> new AppException(ErrorCode.DOCUMENT_NOT_FOUND));
    }

    private void validateUploadRequest(InitDocumentUploadRequest request) {
        if (request.getSizeBytes() > uploadProperties.maxSizeBytes()) {
            throw new AppException(ErrorCode.FILE_TOO_LARGE);
        }
        if (!uploadProperties.allowedContentTypes().contains(request.getContentType())) {
            throw new AppException(ErrorCode.UNSUPPORTED_CONTENT_TYPE);
        }
    }

    private DocumentResponse toResponse(Document document) {
        return DocumentResponse.builder()
                .id(document.getId())
                .ownerUserId(document.getOwnerId())
                .originalFilename(document.getOriginalFileName())
                .contentType(document.getMimeType())
                .sizeBytes(document.getFileSize())
                .checksumSha256(document.getChecksumSha256())
                .r2Bucket(document.getStorageBucket())
                .r2Key(document.getStorageKey())
                .status(document.getStatus())
                .chunkCount(0)
                .errorMessage(document.getErrorMessage())
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .build();
    }

    private String extensionOf(String fileName) {
        String safeFileName = safeFileName(fileName);
        int dotIndex = safeFileName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == safeFileName.length() - 1) {
            return "bin";
        }
        return safeFileName.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
    }

    private String safeFileName(String fileName) {
        String normalized = fileName.replace("\\", "/");
        int slashIndex = normalized.lastIndexOf('/');
        return slashIndex >= 0 ? normalized.substring(slashIndex + 1) : normalized;
    }
}
