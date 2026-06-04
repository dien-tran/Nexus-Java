package com.nexus.document.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class InitDocumentUploadRequest {
    @NotBlank(message = "ORIGINAL_FILENAME_REQUIRED")
    String originalFilename;

    @NotBlank(message = "CONTENT_TYPE_REQUIRED")
    String contentType;

    @NotNull(message = "SIZE_REQUIRED")
    @Min(value = 1, message = "SIZE_INVALID")
    Long sizeBytes;

    @NotBlank(message = "CHECKSUM_REQUIRED")
    @Pattern(regexp = "^[a-fA-F0-9]{64}$", message = "CHECKSUM_INVALID")
    String checksumSha256;
}
