from __future__ import annotations

import logging
from pathlib import Path

import boto3
from botocore.config import Config

from app.config import Settings
from app.models import IngestionMetadata

logger = logging.getLogger(__name__)


class R2Downloader:
    def __init__(self, settings: Settings) -> None:
        self.bucket = settings.r2_bucket
        self.temp_dir = settings.temp_dir
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.r2_endpoint,
            aws_access_key_id=settings.r2_access_key,
            aws_secret_access_key=settings.r2_secret_key,
            region_name=settings.r2_region,
            config=Config(signature_version="s3v4"),
        )

    def download(self, metadata: IngestionMetadata) -> Path:
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        suffix = Path(metadata.originalFileName).suffix or ".bin"
        target = self.temp_dir / f"{metadata.documentId}{suffix}"
        logger.info(
            "[R2] Download start documentId=%s bucket=%s key=%s target=%s",
            metadata.documentId,
            metadata.storageBucket or self.bucket,
            metadata.storageKey,
            target,
        )
        self.client.download_file(metadata.storageBucket or self.bucket, metadata.storageKey, str(target))
        size_bytes = target.stat().st_size if target.exists() else 0
        logger.info("[R2] Download complete documentId=%s localSizeBytes=%s", metadata.documentId, size_bytes)
        return target
