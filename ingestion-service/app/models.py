from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

from pydantic import BaseModel, Field


class DocumentUploadedEvent(BaseModel):
    eventId: str
    documentId: str
    ownerId: str
    storageProvider: str
    storageBucket: str
    storageKey: str
    originalFileName: str
    mimeType: str
    fileSize: int
    checksumSha256: str
    occurredAt: datetime


class IngestionMetadata(BaseModel):
    documentId: str
    ownerId: str
    status: str
    storageProvider: str
    storageBucket: str
    storageKey: str
    mimeType: str
    originalFileName: str
    checksumSha256: str
    fileSize: int


class DocumentIngestionStatusEvent(BaseModel):
    eventId: str
    documentId: str
    ownerId: str
    checksumSha256: str
    status: str
    parseStatus: str
    indexStatus: str
    chunkCount: Optional[int] = None
    errorMessage: Optional[str] = None
    occurredAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class ParsedChunk:
    text: str
    chunk_index: int
    section_path: Optional[str] = None
    heading_path: Optional[str] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    content_hash: str = ""
    token_count: int = 0
    chunking_strategy: str = "unstructured_recursive"
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class ParsedDocument:
    parser_name: str
    parser_version: str
    chunking_strategy: str
    chunks: list[ParsedChunk]
