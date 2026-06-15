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
public class DocumentIngestionStatusEvent {
    String eventId;
    String documentId;
    String ownerId;
    String checksumSha256;
    String status;
    String parseStatus;
    String indexStatus;
    Integer chunkCount;
    String errorMessage;
    Instant occurredAt;
}
