from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from sqlalchemy import (
    Column,
    DateTime,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    and_,
    create_engine,
    delete,
    insert,
    select,
    update,
)
from sqlalchemy.engine import Engine

from app.config import Settings
from app.models import ParsedChunk

logger = logging.getLogger(__name__)

JobDecision = Literal["process", "skip_completed", "busy"]

metadata = MetaData()

ingestion_jobs = Table(
    "ingestion_jobs",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("document_id", String(64), nullable=False, index=True),
    Column("owner_id", String(128), nullable=False, index=True),
    Column("checksum_sha256", String(64), nullable=False, index=True),
    Column("status", String(32), nullable=False, index=True),
    Column("parser_name", String(64)),
    Column("parser_version", String(64)),
    Column("started_at", DateTime(timezone=True)),
    Column("finished_at", DateTime(timezone=True)),
    Column("error_message", Text),
    UniqueConstraint("document_id", "checksum_sha256", name="uk_ingestion_job_document_checksum"),
)

document_chunks = Table(
    "document_chunks",
    metadata,
    Column("chunk_id", String(64), primary_key=True),
    Column("document_id", String(64), nullable=False, index=True),
    Column("owner_id", String(128), nullable=False, index=True),
    Column("checksum_sha256", String(64), nullable=False, index=True),
    Column("chunk_index", Integer, nullable=False),
    Column("qdrant_point_id", String(64), nullable=False),
    Column("section_path", Text),
    Column("heading_path", Text),
    Column("page_start", Integer),
    Column("page_end", Integer),
    Column("token_count", Integer),
    Column("content_hash", String(64), nullable=False),
)


class IngestionRepository:
    def __init__(self, settings: Settings) -> None:
        self.engine: Engine = create_engine(settings.ingestion_mysql_url, pool_pre_ping=True)
        self.processing_timeout = timedelta(seconds=settings.processing_timeout_seconds)

    def init_schema(self) -> None:
        logger.info("[DB] Initializing ingestion schema")
        metadata.create_all(self.engine)
        logger.info("[DB] Ingestion schema ready")

    def acquire_job(self, document_id: str, owner_id: str, checksum: str) -> JobDecision:
        now = datetime.now(timezone.utc)
        logger.info("[DB] Acquire job documentId=%s ownerId=%s checksum=%s", document_id, owner_id, checksum)
        with self.engine.begin() as conn:
            row = conn.execute(
                select(ingestion_jobs).where(
                    and_(
                        ingestion_jobs.c.document_id == document_id,
                        ingestion_jobs.c.checksum_sha256 == checksum,
                    )
                )
            ).mappings().first()

            if row is None:
                conn.execute(
                    insert(ingestion_jobs).values(
                        document_id=document_id,
                        owner_id=owner_id,
                        checksum_sha256=checksum,
                        status="PROCESSING",
                        started_at=now,
                        finished_at=None,
                        error_message=None,
                    )
                )
                logger.info("[DB] Job created documentId=%s status=PROCESSING", document_id)
                return "process"

            if row["status"] == "COMPLETED":
                logger.info("[DB] Job already completed documentId=%s", document_id)
                return "skip_completed"

            if row["status"] == "PROCESSING":
                started_at: Optional[datetime] = row["started_at"]
                if started_at and started_at.tzinfo is None:
                    started_at = started_at.replace(tzinfo=timezone.utc)
                if started_at and now - started_at < self.processing_timeout:
                    logger.info("[DB] Job already processing documentId=%s startedAt=%s", document_id, started_at)
                    return "busy"

            conn.execute(
                update(ingestion_jobs)
                .where(ingestion_jobs.c.id == row["id"])
                .values(
                    owner_id=owner_id,
                    status="PROCESSING",
                    started_at=now,
                    finished_at=None,
                    error_message=None,
                )
            )
            logger.info("[DB] Job reacquired documentId=%s previousStatus=%s", document_id, row["status"])
            return "process"

    def complete_job(
        self,
        document_id: str,
        checksum: str,
        parser_name: str,
        parser_version: str,
        chunks: list[ParsedChunk],
        qdrant_point_ids: list[str],
    ) -> None:
        now = datetime.now(timezone.utc)
        logger.info(
            "[DB] Complete job start documentId=%s chunkCount=%s parser=%s version=%s",
            document_id,
            len(chunks),
            parser_name,
            parser_version,
        )
        with self.engine.begin() as conn:
            conn.execute(
                delete(document_chunks).where(
                    and_(
                        document_chunks.c.document_id == document_id,
                        document_chunks.c.checksum_sha256 == checksum,
                    )
                )
            )
            if chunks:
                conn.execute(
                    insert(document_chunks),
                    [
                        {
                            "chunk_id": chunk.extra["chunk_id"],
                            "document_id": document_id,
                            "owner_id": chunk.extra["owner_id"],
                            "checksum_sha256": checksum,
                            "chunk_index": chunk.chunk_index,
                            "qdrant_point_id": qdrant_point_ids[index],
                            "section_path": chunk.section_path,
                            "heading_path": chunk.heading_path,
                            "page_start": chunk.page_start,
                            "page_end": chunk.page_end,
                            "token_count": chunk.token_count,
                            "content_hash": chunk.content_hash,
                        }
                        for index, chunk in enumerate(chunks)
                    ],
                )
            conn.execute(
                update(ingestion_jobs)
                .where(
                    and_(
                        ingestion_jobs.c.document_id == document_id,
                        ingestion_jobs.c.checksum_sha256 == checksum,
                    )
                )
                .values(
                    status="COMPLETED",
                    parser_name=parser_name,
                    parser_version=parser_version,
                    finished_at=now,
                    error_message=None,
                )
            )
        logger.info("[DB] Complete job done documentId=%s chunkCount=%s", document_id, len(chunks))

    def finish_without_chunks(self, document_id: str, checksum: str, status: str, error_message: str) -> None:
        now = datetime.now(timezone.utc)
        logger.info("[DB] Finish job without chunks documentId=%s status=%s reason=%s", document_id, status, error_message[:200])
        with self.engine.begin() as conn:
            conn.execute(
                update(ingestion_jobs)
                .where(
                    and_(
                        ingestion_jobs.c.document_id == document_id,
                        ingestion_jobs.c.checksum_sha256 == checksum,
                    )
                )
                .values(status=status, finished_at=now, error_message=error_message[:1000])
            )

    def fail_job(self, document_id: str, checksum: str, error_message: str) -> None:
        logger.info("[DB] Mark job failed documentId=%s reason=%s", document_id, error_message[:200])
        self.finish_without_chunks(document_id, checksum, "FAILED", error_message)
