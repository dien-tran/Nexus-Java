package com.nexus.document.config;

import java.net.URI;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
public class R2Config {

    @Bean
    S3Client s3Client(R2Properties properties) {
        var builder = S3Client.builder()
                .region(Region.of(region(properties)))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .credentialsProvider(credentialsProvider(properties));

        if (hasText(properties.endpoint())) {
            builder.endpointOverride(URI.create(properties.endpoint()));
        }

        return builder.build();
    }

    @Bean
    S3Presigner s3Presigner(R2Properties properties) {
        var builder = S3Presigner.builder()
                .region(Region.of(region(properties)))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .credentialsProvider(credentialsProvider(properties));

        if (hasText(properties.endpoint())) {
            builder.endpointOverride(URI.create(properties.endpoint()));
        }

        return builder.build();
    }

    private StaticCredentialsProvider credentialsProvider(R2Properties properties) {
        String accessKey = hasText(properties.accessKey()) ? properties.accessKey() : "missing-access-key";
        String secretKey = hasText(properties.secretKey()) ? properties.secretKey() : "missing-secret-key";
        return StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey));
    }

    private String region(R2Properties properties) {
        return hasText(properties.region()) ? properties.region() : "auto";
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
