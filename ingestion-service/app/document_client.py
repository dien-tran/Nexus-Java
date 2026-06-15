from __future__ import annotations

import logging

import httpx

from app.config import Settings
from app.models import DocumentUploadedEvent, IngestionMetadata

logger = logging.getLogger(__name__)


class DocumentServiceClient:
    def __init__(self, settings: Settings) -> None:
        self.base_url = settings.document_service_base_url.rstrip("/")
        self.token = settings.internal_service_token
        self.timeout = httpx.Timeout(10.0)

    def get_ingestion_metadata(self, document_id: str) -> IngestionMetadata:
        url = f"{self.base_url}/internal/documents/{document_id}/ingestion-metadata"
        headers = {"X-Internal-Service-Token": self.token}
        logger.info("[VERIFY] Fetching ingestion metadata documentId=%s url=%s", document_id, url)
        with httpx.Client(timeout=self.timeout) as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
            metadata = IngestionMetadata.model_validate(response.json())
            logger.info(
                "[VERIFY] Metadata fetched documentId=%s ownerId=%s status=%s mimeType=%s storageKey=%s",
                metadata.documentId,
                metadata.ownerId,
                metadata.status,
                metadata.mimeType,
                metadata.storageKey,
            )
            return metadata

    def verify_event(self, event: DocumentUploadedEvent) -> IngestionMetadata:
        logger.info("[VERIFY] Verifying Kafka event eventId=%s documentId=%s", event.eventId, event.documentId)
        metadata = self.get_ingestion_metadata(event.documentId)
        expected = {
            "documentId": event.documentId,
            "ownerId": event.ownerId,
            "storageBucket": event.storageBucket,
            "storageKey": event.storageKey,
            "checksumSha256": event.checksumSha256,
        }
        actual = metadata.model_dump()
        mismatches = [key for key, expected_value in expected.items() if actual.get(key) != expected_value]
        if mismatches:
            logger.warning(
                "[VERIFY] Rejected event documentId=%s mismatches=%s",
                event.documentId,
                ",".join(mismatches),
            )
            raise RejectedEvent(f"Document metadata mismatch for keys: {', '.join(mismatches)}")
        if metadata.status == "DELETED":
            logger.info("[VERIFY] Skipping deleted document documentId=%s", metadata.documentId)
            raise SkippedDocument("Document was deleted before ingestion")
        logger.info("[VERIFY] Event verified documentId=%s ownerId=%s", metadata.documentId, metadata.ownerId)
        return metadata


class RejectedEvent(Exception):
    pass


class SkippedDocument(Exception):
    pass
