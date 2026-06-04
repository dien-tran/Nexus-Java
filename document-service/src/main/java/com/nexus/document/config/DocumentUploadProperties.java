package com.nexus.document.config;

import java.util.Set;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "document.upload")
public record DocumentUploadProperties(
        long maxSizeBytes,
        Set<String> allowedContentTypes
) {
}
