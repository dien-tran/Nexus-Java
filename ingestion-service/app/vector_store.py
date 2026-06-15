from __future__ import annotations

import logging
import uuid

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, FieldCondition, Filter, MatchValue, PointStruct, VectorParams

from app.config import Settings
from app.models import IngestionMetadata, ParsedChunk

logger = logging.getLogger(__name__)


class QdrantVectorStore:
    def __init__(self, settings: Settings) -> None:
        self.collection = settings.qdrant_collection
        self.dimension = settings.embedding_dimension
        self.client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None)

    def ensure_collection(self) -> None:
        if self.client.collection_exists(self.collection):
            logger.info("[QDRANT] Collection exists collection=%s dimension=%s", self.collection, self.dimension)
            return
        logger.info("[QDRANT] Creating collection collection=%s dimension=%s", self.collection, self.dimension)
        self.client.create_collection(
            collection_name=self.collection,
            vectors_config=VectorParams(size=self.dimension, distance=Distance.COSINE),
        )
        logger.info("[QDRANT] Collection created collection=%s", self.collection)

    def delete_document_vectors(self, document_id: str, checksum: str) -> None:
        logger.info("[QDRANT] Delete old vectors documentId=%s checksum=%s", document_id, checksum)
        self.client.delete(
            collection_name=self.collection,
            points_selector=Filter(
                must=[
                    FieldCondition(key="documentId", match=MatchValue(value=document_id)),
                    FieldCondition(key="checksumSha256", match=MatchValue(value=checksum)),
                ]
            ),
        )
        logger.info("[QDRANT] Delete old vectors complete documentId=%s", document_id)

    def upsert_chunks(
        self,
        metadata: IngestionMetadata,
        chunks: list[ParsedChunk],
        embeddings: list[list[float]],
        parser_name: str,
    ) -> list[str]:
        logger.info(
            "[QDRANT] Upsert start documentId=%s ownerId=%s chunkCount=%s parser=%s",
            metadata.documentId,
            metadata.ownerId,
            len(chunks),
            parser_name,
        )
        point_ids = [
            str(uuid.uuid5(uuid.NAMESPACE_URL, f"{metadata.documentId}:{metadata.checksumSha256}:{chunk.chunk_index}:{chunk.content_hash}"))
            for chunk in chunks
        ]
        points = [
            PointStruct(
                id=point_ids[index],
                vector=embeddings[index],
                payload={
                    "ownerId": metadata.ownerId,
                    "documentId": metadata.documentId,
                    "chunkId": chunk.extra["chunk_id"],
                    "chunkIndex": chunk.chunk_index,
                    "checksumSha256": metadata.checksumSha256,
                    "fileName": metadata.originalFileName,
                    "mimeType": metadata.mimeType,
                    "sectionPath": chunk.section_path,
                    "headingPath": chunk.heading_path,
                    "pageStart": chunk.page_start,
                    "pageEnd": chunk.page_end,
                    "parserName": parser_name,
                    "chunkingStrategy": chunk.chunking_strategy,
                },
            )
            for index, chunk in enumerate(chunks)
        ]
        self.client.upsert(collection_name=self.collection, points=points)
        logger.info("[QDRANT] Upsert complete documentId=%s pointCount=%s", metadata.documentId, len(point_ids))
        return point_ids
