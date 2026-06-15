from __future__ import annotations

import hashlib
import importlib.metadata
import logging
import subprocess
import tempfile
from pathlib import Path
from typing import Iterable, Optional

from app.config import Settings
from app.models import IngestionMetadata, ParsedChunk, ParsedDocument

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt", ".md", ".markdown"}
UNSUPPORTED_EXTENSIONS = {".ppt", ".xlsx", ".xls", ".png", ".jpg", ".jpeg"}


class UnsupportedDocument(Exception):
    pass


class DocumentParser:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def parse(self, file_path: Path, metadata: IngestionMetadata) -> ParsedDocument:
        extension = file_path.suffix.lower()
        logger.info(
            "[PARSER] Parse start documentId=%s fileName=%s mimeType=%s extension=%s",
            metadata.documentId,
            metadata.originalFileName,
            metadata.mimeType,
            extension,
        )
        if extension in UNSUPPORTED_EXTENSIONS or extension not in SUPPORTED_EXTENSIONS:
            logger.info("[PARSER] Unsupported file type documentId=%s extension=%s", metadata.documentId, extension)
            raise UnsupportedDocument(f"Unsupported ingestion file type: {extension or metadata.mimeType}")

        try:
            return self._parse_with_docling(file_path, metadata)
        except Exception as exception:
            logger.warning(
                "[PARSER] Docling parse failed documentId=%s extension=%s error=%s",
                metadata.documentId,
                extension,
                str(exception)[:300],
            )
            if extension == ".pdf" and self.settings.marker_enabled:
                return self._parse_with_marker(file_path, metadata)
            if extension in {".txt", ".md", ".markdown"}:
                return self._parse_plain_text(file_path, metadata)
            raise

    def _parse_with_docling(self, file_path: Path, metadata: IngestionMetadata) -> ParsedDocument:
        from docling.chunking import HybridChunker
        from docling.document_converter import DocumentConverter

        docling_version = importlib.metadata.version("docling")
        logger.info("[PARSER] Docling convert start documentId=%s version=%s", metadata.documentId, docling_version)
        document = DocumentConverter().convert(source=str(file_path)).document
        logger.info("[PARSER] Docling convert complete documentId=%s", metadata.documentId)
        chunker = HybridChunker()
        logger.info("[PARSER] Docling hybrid chunking start documentId=%s", metadata.documentId)
        raw_chunks = list(chunker.chunk(dl_doc=document))
        chunks = []
        for index, raw_chunk in enumerate(raw_chunks):
            text = chunker.contextualize(chunk=raw_chunk).strip()
            if not text:
                continue
            chunks.append(self._build_chunk(index, text, raw_chunk, metadata, "docling_hybrid"))

        if not chunks:
            raise UnsupportedDocument("Parser produced no text chunks")

        logger.info(
            "[PARSER] Docling hybrid chunking complete documentId=%s rawChunkCount=%s chunkCount=%s",
            metadata.documentId,
            len(raw_chunks),
            len(chunks),
        )
        return ParsedDocument(
            parser_name="docling",
            parser_version=docling_version,
            chunking_strategy="docling_hybrid",
            chunks=chunks,
        )

    def _parse_with_marker(self, file_path: Path, metadata: IngestionMetadata) -> ParsedDocument:
        logger.info("[PARSER] Marker fallback start documentId=%s command=%s", metadata.documentId, self.settings.marker_command)
        with tempfile.TemporaryDirectory() as output_dir:
            subprocess.run(
                [
                    self.settings.marker_command,
                    str(file_path),
                    "--output_dir",
                    output_dir,
                    "--output_format",
                    "markdown",
                ],
                check=True,
                capture_output=True,
                text=True,
            )
            markdown_files = list(Path(output_dir).rglob("*.md"))
            if not markdown_files:
                raise UnsupportedDocument("Marker produced no markdown output")
            text = "\n\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in markdown_files)
        parsed = self._chunks_from_text(text, metadata, "marker", "marker_pdf_recursive")
        logger.info("[PARSER] Marker fallback complete documentId=%s chunkCount=%s", metadata.documentId, len(parsed.chunks))
        return parsed

    def _parse_plain_text(self, file_path: Path, metadata: IngestionMetadata) -> ParsedDocument:
        logger.info("[PARSER] Plain text fallback start documentId=%s", metadata.documentId)
        text = file_path.read_text(encoding="utf-8", errors="ignore")
        parsed = self._chunks_from_text(text, metadata, "plain-text", "unstructured_recursive")
        logger.info("[PARSER] Plain text fallback complete documentId=%s chunkCount=%s", metadata.documentId, len(parsed.chunks))
        return parsed

    def _chunks_from_text(
        self,
        text: str,
        metadata: IngestionMetadata,
        parser_name: str,
        chunking_strategy: str,
    ) -> ParsedDocument:
        normalized = "\n".join(line.rstrip() for line in text.splitlines())
        parts = list(recursive_split(normalized, chunk_size=4000, overlap=600))
        chunks = [
            self._build_chunk(index, part, None, metadata, chunking_strategy)
            for index, part in enumerate(parts)
            if part.strip()
        ]
        if not chunks:
            raise UnsupportedDocument("Parser produced no text chunks")
        logger.info(
            "[PARSER] Recursive chunking complete documentId=%s parser=%s chunkCount=%s",
            metadata.documentId,
            parser_name,
            len(chunks),
        )
        return ParsedDocument(
            parser_name=parser_name,
            parser_version="n/a",
            chunking_strategy=chunking_strategy,
            chunks=chunks,
        )

    def _build_chunk(
        self,
        index: int,
        text: str,
        raw_chunk: object,
        metadata: IngestionMetadata,
        chunking_strategy: str,
    ) -> ParsedChunk:
        content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        chunk_id = hashlib.sha256(
            f"{metadata.documentId}:{metadata.checksumSha256}:{index}:{content_hash}".encode("utf-8")
        ).hexdigest()[:32]
        heading_path = extract_heading_path(raw_chunk)
        page_start, page_end = extract_page_range(raw_chunk)
        chunk = ParsedChunk(
            text=text,
            chunk_index=index,
            section_path=heading_path,
            heading_path=heading_path,
            page_start=page_start,
            page_end=page_end,
            content_hash=content_hash,
            token_count=estimate_token_count(text),
            chunking_strategy=chunking_strategy,
        )
        chunk.extra.update({"chunk_id": chunk_id, "owner_id": metadata.ownerId})
        return chunk


def recursive_split(text: str, chunk_size: int, overlap: int) -> Iterable[str]:
    text = text.strip()
    if not text:
        return []

    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        window = text[start:end]
        split_at = max(window.rfind("\n\n"), window.rfind("\n"), window.rfind(". "))
        if split_at > chunk_size // 2 and end < len(text):
            end = start + split_at + 1
        chunks.append(text[start:end].strip())
        if end >= len(text):
            break
        start = max(0, end - overlap)
    return chunks


def extract_heading_path(raw_chunk: object) -> Optional[str]:
    meta = getattr(raw_chunk, "meta", None)
    headings = getattr(meta, "headings", None)
    if isinstance(headings, list) and headings:
        return " > ".join(str(item) for item in headings if item)
    return None


def extract_page_range(raw_chunk: object) -> tuple[Optional[int], Optional[int]]:
    meta = getattr(raw_chunk, "meta", None)
    doc_items = getattr(meta, "doc_items", None) or []
    pages = []
    for item in doc_items:
        for prov in getattr(item, "prov", []) or []:
            page_no = getattr(prov, "page_no", None)
            if page_no is not None:
                pages.append(int(page_no))
    if not pages:
        return None, None
    return min(pages), max(pages)


def estimate_token_count(text: str) -> int:
    return max(1, int(len(text.split()) * 1.3))
