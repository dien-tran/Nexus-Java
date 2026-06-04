package com.nexus.document.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

import lombok.Getter;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(1001, "Uncategorized error", HttpStatus.BAD_REQUEST),
    DOCUMENT_NOT_FOUND(3001, "Document not found", HttpStatus.NOT_FOUND),
    DOCUMENT_DUPLICATED(3002, "Document already exists", HttpStatus.CONFLICT),
    FILE_TOO_LARGE(3003, "File is too large", HttpStatus.BAD_REQUEST),
    UNSUPPORTED_CONTENT_TYPE(3004, "Unsupported content type", HttpStatus.BAD_REQUEST),
    UPLOAD_NOT_PENDING(3005, "Document upload is not pending", HttpStatus.BAD_REQUEST),
    R2_OBJECT_NOT_FOUND(3006, "Uploaded object was not found in R2", HttpStatus.BAD_REQUEST),
    R2_CONFIG_MISSING(3007, "R2 configuration is missing", HttpStatus.INTERNAL_SERVER_ERROR),
    UNAUTHORIZED(3008, "You do not have permission", HttpStatus.FORBIDDEN),
    DOCUMENT_NOT_READY(3009, "Document is not ready for download", HttpStatus.BAD_REQUEST),
    R2_OBJECT_MISMATCH(3010, "Uploaded object metadata does not match document metadata", HttpStatus.BAD_REQUEST),
    ;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;
}
