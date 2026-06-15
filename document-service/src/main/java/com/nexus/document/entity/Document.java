package com.nexus.document.entity;

import java.time.Instant;

import com.nexus.document.constant.DocumentStatus;
import com.nexus.document.constant.ProcessingStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@Entity
@Table(name = "documents", indexes = {
        @Index(name = "idx_documents_owner_status", columnList = "owner_id,status"),
        @Index(name = "idx_documents_owner_checksum", columnList = "owner_id,checksum_sha256")
})
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Document {
    @Id
    String id;

    @Column(name = "owner_id", nullable = false)
    String ownerId;

    @Column(nullable = false)
    String fileName;

    @Column(nullable = false)
    String originalFileName;

    @Column(nullable = false)
    String mimeType;

    @Column(nullable = false, length = 32)
    String fileExtension;

    @Column(nullable = false)
    Long fileSize;

    @Column(nullable = false)
    String storageProvider;

    @Column(nullable = false)
    String storageBucket;

    @Column(nullable = false, length = 1024)
    String storageKey;

    @Column(name = "checksum_sha256", nullable = false, length = 64)
    String checksumSha256;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    DocumentStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    ProcessingStatus parseStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    ProcessingStatus indexStatus;

    @Column(length = 1000)
    String errorMessage;

    Integer chunkCount;

    Instant uploadUrlExpiresAt;
    Instant uploadedAt;
    Instant createdAt;
    Instant updatedAt;
    Instant indexedAt;
    Instant deletedAt;
}
