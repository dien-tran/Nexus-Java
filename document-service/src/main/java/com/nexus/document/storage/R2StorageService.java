package com.nexus.document.storage;

import java.time.Duration;
import java.time.Instant;

import com.nexus.document.config.R2Properties;
import com.nexus.document.exception.AppException;
import com.nexus.document.exception.ErrorCode;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class R2StorageService {

    S3Client s3Client;
    S3Presigner s3Presigner;
    R2Properties properties;

    public String bucket() {
        requireConfigured();
        return properties.bucket();
    }

    public PresignedUrl createUploadUrl(String key, String contentType, long sizeBytes) {
        requireConfigured();
        Duration duration = Duration.ofMinutes(properties.presignedUploadExpiresMinutes());
        Instant expiresAt = Instant.now().plus(duration);

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(properties.bucket())
                .key(key)
                .contentType(contentType)
                .contentLength(sizeBytes)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(duration)
                .putObjectRequest(putObjectRequest)
                .build();

        return new PresignedUrl(s3Presigner.presignPutObject(presignRequest).url().toString(), expiresAt);
    }

    public PresignedUrl createDownloadUrl(String key, String fileName, String contentType, String disposition) {
        requireConfigured();
        Duration duration = Duration.ofMinutes(properties.presignedDownloadExpiresMinutes());
        Instant expiresAt = Instant.now().plus(duration);
        String safeDisposition = "attachment".equalsIgnoreCase(disposition) ? "attachment" : "inline";

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(properties.bucket())
                .key(key)
                .responseContentType(contentType)
                .responseContentDisposition(safeDisposition + "; filename=\"" + fileName.replace("\"", "") + "\"")
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(duration)
                .getObjectRequest(getObjectRequest)
                .build();

        return new PresignedUrl(s3Presigner.presignGetObject(presignRequest).url().toString(), expiresAt);
    }

    public R2ObjectMetadata headObject(String key) {
        requireConfigured();
        try {
            var response = s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(properties.bucket())
                    .key(key)
                    .build());
            return new R2ObjectMetadata(response.contentLength(), response.contentType());
        } catch (NoSuchKeyException exception) {
            throw new AppException(ErrorCode.R2_OBJECT_NOT_FOUND);
        } catch (S3Exception exception) {
            if (exception.statusCode() == 404) {
                throw new AppException(ErrorCode.R2_OBJECT_NOT_FOUND);
            }
            throw exception;
        }
    }

    private void requireConfigured() {
        if (isBlank(properties.endpoint()) || isBlank(properties.accessKey())
                || isBlank(properties.secretKey()) || isBlank(properties.bucket())) {
            throw new AppException(ErrorCode.R2_CONFIG_MISSING);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
