package com.nexus.document.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "internal.service")
public record InternalServiceProperties(String token) {
}
