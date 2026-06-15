from __future__ import annotations

import json
import logging
import signal
from typing import Any

from confluent_kafka import Consumer, KafkaError, KafkaException

from app.config import get_settings
from app.db import IngestionRepository
from app.document_client import DocumentServiceClient
from app.embedding import EmbeddingClient
from app.models import DocumentUploadedEvent
from app.parser import DocumentParser
from app.processor import IngestionProcessor
from app.status_publisher import StatusPublisher
from app.storage import R2Downloader
from app.vector_store import QdrantVectorStore

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)
running = True


def handle_shutdown(_signum: int, _frame: Any) -> None:
    global running
    running = False


def build_processor() -> IngestionProcessor:
    settings = get_settings()
    logger.info("[BOOT] Building ingestion processor")
    repository = IngestionRepository(settings)
    repository.init_schema()
    vector_store = QdrantVectorStore(settings)
    vector_store.ensure_collection()
    processor = IngestionProcessor(
        document_client=DocumentServiceClient(settings),
        downloader=R2Downloader(settings),
        parser=DocumentParser(settings),
        embedder=EmbeddingClient(settings),
        vector_store=vector_store,
        repository=repository,
        status_publisher=StatusPublisher(settings),
    )
    logger.info("[BOOT] Ingestion processor ready")
    return processor


def main() -> None:
    settings = get_settings()
    processor = build_processor()
    consumer = Consumer(
        {
            "bootstrap.servers": settings.kafka_bootstrap_servers,
            "group.id": settings.ingestion_consumer_group,
            "auto.offset.reset": "earliest",
            "enable.auto.commit": False,
        }
    )
    consumer.subscribe([settings.document_uploaded_topic])
    signal.signal(signal.SIGTERM, handle_shutdown)
    signal.signal(signal.SIGINT, handle_shutdown)
    logger.info("[BOOT] Ingestion service consuming topic=%s group=%s", settings.document_uploaded_topic, settings.ingestion_consumer_group)

    try:
        while running:
            message = consumer.poll(1.0)
            if message is None:
                continue
            if message.error():
                if message.error().code() == KafkaError._PARTITION_EOF:
                    continue
                raise KafkaException(message.error())

            logger.info(
                "[KAFKA] Message received topic=%s partition=%s offset=%s key=%s",
                message.topic(),
                message.partition(),
                message.offset(),
                message.key().decode("utf-8") if message.key() else None,
            )
            payload = json.loads(message.value().decode("utf-8"))
            event = DocumentUploadedEvent.model_validate(payload)
            processor.process(event)
            consumer.commit(message=message)
            logger.info("[KAFKA] Message committed documentId=%s offset=%s", event.documentId, message.offset())
    finally:
        consumer.close()


if __name__ == "__main__":
    main()
