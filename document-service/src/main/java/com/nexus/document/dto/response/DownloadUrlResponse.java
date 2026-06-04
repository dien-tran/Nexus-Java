package com.nexus.document.dto.response;

import java.time.Instant;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DownloadUrlResponse {
    String documentId;
    String url;
    String method;
    Instant expiresAt;
    String contentType;
    String fileName;
}
