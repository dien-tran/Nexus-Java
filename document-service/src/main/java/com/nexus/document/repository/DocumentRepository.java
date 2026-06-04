package com.nexus.document.repository;

import java.util.List;
import java.util.Optional;

import com.nexus.document.constant.DocumentStatus;
import com.nexus.document.entity.Document;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentRepository extends JpaRepository<Document, String> {
    boolean existsByOwnerIdAndChecksumSha256AndStatusNot(String ownerId, String checksumSha256, DocumentStatus status);

    List<Document> findByOwnerIdAndStatusNotOrderByCreatedAtDesc(String ownerId, DocumentStatus status);

    Optional<Document> findByIdAndOwnerId(String id, String ownerId);
}
