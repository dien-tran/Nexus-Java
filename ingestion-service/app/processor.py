from __future__ import annotations

import logging

from app.db import IngestionRepository
from app.document_client import DocumentServiceClient, RejectedEvent, SkippedDocument
from app.embedding import EmbeddingClient
from app.models import DocumentUploadedEvent, IngestionMetadata
from app.parser import DocumentParser, UnsupportedDocument
from app.status_publisher import StatusPublisher
from app.storage import R2Downloader
from app.vector_store import QdrantVectorStore

logger = logging.getLogger(__name__)


class IngestionProcessor:
    def __init__(
        self,
        document_client: DocumentServiceClient,
        downloader: R2Downloader,
        parser: DocumentParser,
        embedder: EmbeddingClient,
        vector_store: QdrantVectorStore,
        repository: IngestionRepository,
        status_publisher: StatusPublisher,
    ) -> None:
        self.document_client = document_client
        self.downloader = downloader
        self.parser = parser
        self.embedder = embedder
        self.vector_store = vector_store
        self.repository = repository
        self.status_publisher = status_publisher

    def process(self, event: DocumentUploadedEvent) -> None:
        metadata: IngestionMetadata | None = None
        acquired = False
        logger.info(
            "[PIPELINE] Start eventId=%s documentId=%s ownerId=%s mimeType=%s storageKey=%s",
            event.eventId,
            event.documentId,
            event.ownerId,
            event.mimeType,
            event.storageKey,
        )
        try:
            metadata = self.document_client.verify_event(event)
            decision = self.repository.acquire_job(metadata.documentId, metadata.ownerId, metadata.checksumSha256)
            if decision == "busy":
                logger.info("[PIPELINE] Stop: already processing documentId=%s", metadata.documentId)
                return
            if decision == "skip_completed":
                logger.info("[PIPELINE] Stop: already completed documentId=%s", metadata.documentId)
                return

            acquired = True
            logger.info("[PIPELINE] Job acquired documentId=%s", metadata.documentId)
            self.status_publisher.publish(metadata, "PROCESSING", "PROCESSING", "PENDING")
            file_path = self.downloader.download(metadata)
            try:
                parsed = self.parser.parse(file_path, metadata)
            except UnsupportedDocument as exception:
                message = str(exception)
                logger.info("[PIPELINE] Unsupported document documentId=%s reason=%s", metadata.documentId, message)
                self.repository.finish_without_chunks(metadata.documentId, metadata.checksumSha256, "SKIPPED", message)
                self.status_publisher.publish(metadata, "SKIPPED", "SKIPPED", "SKIPPED", error_message=message)
                return

            texts = [chunk.text for chunk in parsed.chunks]
            logger.info(
                "[PIPELINE] Parsed document documentId=%s parser=%s chunkCount=%s",
                metadata.documentId,
                parsed.parser_name,
                len(parsed.chunks),
            )
            embeddings = self.embedder.embed(texts)
            if len(embeddings) != len(parsed.chunks):
                raise RuntimeError("Embedding response count does not match chunk count")

            self.vector_store.ensure_collection()
            self.vector_store.delete_document_vectors(metadata.documentId, metadata.checksumSha256)
            point_ids = self.vector_store.upsert_chunks(metadata, parsed.chunks, embeddings, parsed.parser_name)
            self.repository.complete_job(
                metadata.documentId,
                metadata.checksumSha256,
                parsed.parser_name,
                parsed.parser_version,
                parsed.chunks,
                point_ids,
            )
            self.status_publisher.publish(
                metadata,
                "READY",
                "COMPLETED",
                "COMPLETED",
                chunk_count=len(parsed.chunks),
            )
            logger.info("[PIPELINE] Complete documentId=%s chunkCount=%s", metadata.documentId, len(parsed.chunks))
        except SkippedDocument:
            logger.info("[PIPELINE] Stop: deleted document event documentId=%s", event.documentId)
        except RejectedEvent:
            logger.warning("[PIPELINE] Stop: rejected invalid document event documentId=%s", event.documentId)
        except Exception as exception:
            logger.exception("[PIPELINE] Failed documentId=%s", event.documentId)
            if metadata is not None and acquired:
                message = str(exception)
                self.repository.fail_job(metadata.documentId, metadata.checksumSha256, message)
                self.status_publisher.publish(metadata, "FAILED", "FAILED", "FAILED", error_message=message)
            else:
                raise
