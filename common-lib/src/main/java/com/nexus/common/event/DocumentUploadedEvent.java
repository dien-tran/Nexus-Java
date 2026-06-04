package com.nexus.common.event;

import java.time.Instant;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DocumentUploadedEvent {
    String eventId;
    String documentId;
    String ownerId;
    String storageProvider;
    String storageBucket;
    String storageKey;
    String originalFileName;
    String mimeType;
    Long fileSize;
    String checksumSha256;
    Instant occurredAt;
}
