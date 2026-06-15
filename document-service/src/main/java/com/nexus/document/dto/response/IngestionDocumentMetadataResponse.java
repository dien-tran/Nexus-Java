package com.nexus.document.dto.response;

import com.nexus.document.constant.DocumentStatus;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class IngestionDocumentMetadataResponse {
    String documentId;
    String ownerId;
    DocumentStatus status;
    String storageProvider;
    String storageBucket;
    String storageKey;
    String mimeType;
    String originalFileName;
    String checksumSha256;
    Long fileSize;
}
