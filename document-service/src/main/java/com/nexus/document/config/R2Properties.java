package com.nexus.document.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "document.r2")
public record R2Properties(
        String endpoint,
        String accessKey,
        String secretKey,
        String bucket,
        String region,
        long presignedUploadExpiresMinutes,
        long presignedDownloadExpiresMinutes
) {
}
