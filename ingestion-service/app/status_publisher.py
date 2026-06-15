from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone

from confluent_kafka import Producer

from app.config import Settings
from app.models import DocumentIngestionStatusEvent, IngestionMetadata

logger = logging.getLogger(__name__)


class StatusPublisher:
    def __init__(self, settings: Settings) -> None:
        self.topic = settings.document_ingestion_status_topic
        self.producer = Producer({"bootstrap.servers": settings.kafka_bootstrap_servers})

    def publish(
        self,
        metadata: IngestionMetadata,
        status: str,
        parse_status: str,
        index_status: str,
        chunk_count: int | None = None,
        error_message: str | None = None,
    ) -> None:
        event = DocumentIngestionStatusEvent(
            eventId=str(uuid.uuid4()),
            documentId=metadata.documentId,
            ownerId=metadata.ownerId,
            checksumSha256=metadata.checksumSha256,
            status=status,
            parseStatus=parse_status,
            indexStatus=index_status,
            chunkCount=chunk_count,
            errorMessage=error_message[:1000] if error_message else None,
            occurredAt=datetime.now(timezone.utc),
        )
        payload = event.model_dump(mode="json")
        logger.info(
            "[STATUS] Publish start topic=%s documentId=%s status=%s parseStatus=%s indexStatus=%s chunkCount=%s",
            self.topic,
            metadata.documentId,
            status,
            parse_status,
            index_status,
            chunk_count,
        )
        self.producer.produce(
            self.topic,
            key=metadata.documentId,
            value=json.dumps(payload).encode("utf-8"),
        )
        self.producer.flush()
        logger.info("[STATUS] Publish complete topic=%s documentId=%s status=%s", self.topic, metadata.documentId, status)
