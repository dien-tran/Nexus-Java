from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    chat_service_port: int = Field(default=8090, alias="CHAT_SERVICE_PORT")
    jwt_signer_key: str = Field(alias="JWT_SIGNER_KEY")
    llm_provider: str = Field(default="openrouter", alias="LLM_PROVIDER")
    llm_model: str = Field(default="", alias="LLM_MODEL")
    llm_api_key: Optional[str] = Field(default=None, alias="LLM_API_KEY")
    llm_base_url: Optional[str] = Field(default="https://openrouter.ai/api/v1", alias="LLM_BASE_URL")
    work_service_base_url: str = Field(default="http://localhost:8082", alias="WORK_SERVICE_BASE_URL")
    work_service_timeout_seconds: float = Field(default=5.0, alias="WORK_SERVICE_TIMEOUT_SECONDS")


@lru_cache
def get_settings() -> Settings:
    return Settings()
