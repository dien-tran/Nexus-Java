package com.nexus.document.dto.response;

import java.time.Instant;

import com.nexus.document.constant.DocumentStatus;
import com.nexus.document.constant.ProcessingStatus;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DocumentResponse {
    String id;
    String ownerUserId;
    String originalFilename;
    String contentType;
    Long sizeBytes;
    String checksumSha256;
    String r2Bucket;
    String r2Key;
    DocumentStatus status;
    ProcessingStatus parseStatus;
    ProcessingStatus indexStatus;
    Integer chunkCount;
    String errorMessage;
    Instant createdAt;
    Instant updatedAt;
    Instant indexedAt;
}
