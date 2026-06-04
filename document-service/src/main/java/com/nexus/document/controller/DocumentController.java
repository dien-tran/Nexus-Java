package com.nexus.document.controller;

import java.util.List;

import com.nexus.document.dto.request.InitDocumentUploadRequest;
import com.nexus.document.dto.response.DocumentResponse;
import com.nexus.document.dto.response.DownloadUrlResponse;
import com.nexus.document.dto.response.InitDocumentUploadResponse;
import com.nexus.document.security.CurrentUserProvider;
import com.nexus.document.service.DocumentService;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/documents")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DocumentController {

    DocumentService documentService;
    CurrentUserProvider currentUserProvider;

    @PostMapping("/uploads/init")
    public InitDocumentUploadResponse initUpload(@Valid @RequestBody InitDocumentUploadRequest request) {
        return documentService.initUpload(currentUserProvider.currentUserId(), request);
    }

    @PostMapping("/{id}/uploads/complete")
    public DocumentResponse completeUpload(@PathVariable String id) {
        return documentService.completeUpload(currentUserProvider.currentUserId(), id);
    }

    @GetMapping
    public List<DocumentResponse> getDocuments() {
        return documentService.getDocuments(currentUserProvider.currentUserId());
    }

    @GetMapping("/{id}")
    public DocumentResponse getDocument(@PathVariable String id) {
        return documentService.getDocument(currentUserProvider.currentUserId(), id);
    }

    @GetMapping("/{id}/download-url")
    public DownloadUrlResponse getDownloadUrl(
            @PathVariable String id,
            @RequestParam(defaultValue = "inline") String disposition) {
        return documentService.getDownloadUrl(currentUserProvider.currentUserId(), id, disposition);
    }

    @DeleteMapping("/{id}")
    public String deleteDocument(@PathVariable String id) {
        documentService.deleteDocument(currentUserProvider.currentUserId(), id);
        return "Document deleted successfully";
    }
}
