from __future__ import annotations

import logging

from openai import OpenAI

from app.config import Settings

logger = logging.getLogger(__name__)


class EmbeddingClient:
    def __init__(self, settings: Settings) -> None:
        self.model = settings.embedding_model
        self.client = OpenAI(api_key=settings.openai_api_key)

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            logger.info("[EMBED] No texts to embed")
            return []
        logger.info("[EMBED] Embedding start model=%s chunkCount=%s", self.model, len(texts))
        response = self.client.embeddings.create(model=self.model, input=texts)
        embeddings = [item.embedding for item in response.data]
        dimension = len(embeddings[0]) if embeddings else 0
        logger.info("[EMBED] Embedding complete model=%s chunkCount=%s dimension=%s", self.model, len(embeddings), dimension)
        return embeddings
