from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    kafka_bootstrap_servers: str = Field(default="localhost:9092", alias="KAFKA_BOOTSTRAP_SERVERS")
    document_uploaded_topic: str = Field(default="document.uploaded.v1", alias="DOCUMENT_UPLOADED_TOPIC")
    document_ingestion_status_topic: str = Field(
        default="document.ingestion.status.v1",
        alias="DOCUMENT_INGESTION_STATUS_TOPIC",
    )
    ingestion_consumer_group: str = Field(default="nexus-ingestion-service", alias="INGESTION_CONSUMER_GROUP")

    document_service_base_url: str = Field(default="http://localhost:8083", alias="DOCUMENT_SERVICE_BASE_URL")
    internal_service_token: str = Field(alias="INTERNAL_SERVICE_TOKEN")

    r2_endpoint: str = Field(alias="R2_ENDPOINT")
    r2_access_key: str = Field(alias="R2_ACCESS_KEY")
    r2_secret_key: str = Field(alias="R2_SECRET_KEY")
    r2_bucket: str = Field(alias="R2_BUCKET")
    r2_region: str = Field(default="auto", alias="R2_REGION")

    ingestion_mysql_url: str = Field(alias="INGESTION_MYSQL_URL")

    qdrant_url: str = Field(default="http://localhost:6333", alias="QDRANT_URL")
    qdrant_api_key: Optional[str] = Field(default=None, alias="QDRANT_API_KEY")
    qdrant_collection: str = Field(default="nexus_documents", alias="QDRANT_COLLECTION")

    openai_api_key: str = Field(alias="OPENAI_API_KEY")
    embedding_model: str = Field(default="text-embedding-3-small", alias="EMBEDDING_MODEL")
    embedding_dimension: int = Field(default=1536, alias="EMBEDDING_DIMENSION")

    marker_enabled: bool = Field(default=False, alias="MARKER_ENABLED")
    marker_command: str = Field(default="marker_single", alias="MARKER_COMMAND")
    processing_timeout_seconds: int = Field(default=1800, alias="PROCESSING_TIMEOUT_SECONDS")
    temp_dir: Path = Field(default=Path("/tmp/nexus-ingestion"), alias="INGESTION_TEMP_DIR")


@lru_cache
def get_settings() -> Settings:
    return Settings()
