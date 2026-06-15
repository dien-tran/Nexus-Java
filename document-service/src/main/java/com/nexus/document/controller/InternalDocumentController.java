package com.nexus.document.controller;

import com.nexus.document.config.InternalServiceProperties;
import com.nexus.document.dto.response.IngestionDocumentMetadataResponse;
import com.nexus.document.exception.AppException;
import com.nexus.document.exception.ErrorCode;
import com.nexus.document.service.DocumentService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/documents")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class InternalDocumentController {

    static final String INTERNAL_TOKEN_HEADER = "X-Internal-Service-Token";

    DocumentService documentService;
    InternalServiceProperties internalServiceProperties;

    @GetMapping("/{id}/ingestion-metadata")
    public IngestionDocumentMetadataResponse getIngestionMetadata(
            @PathVariable String id,
            @RequestHeader(value = INTERNAL_TOKEN_HEADER, required = false) String token) {
        if (internalServiceProperties.token() == null
                || internalServiceProperties.token().isBlank()
                || !internalServiceProperties.token().equals(token)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        return documentService.getIngestionMetadata(id);
    }
}
