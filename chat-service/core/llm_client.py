import json
from typing import Any

from openai import OpenAI

from core.config import get_settings


class LlmClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.enabled = bool(self.settings.llm_api_key and self.settings.llm_model)
        self.client = None
        if self.enabled:
            kwargs: dict[str, Any] = {"api_key": self.settings.llm_api_key}
            base_url = self.settings.llm_base_url
            if self.settings.llm_provider.lower() == "openrouter" and not base_url:
                base_url = "https://openrouter.ai/api/v1"
            if base_url:
                kwargs["base_url"] = base_url
            self.client = OpenAI(**kwargs)

    def complete(self, messages: list[dict[str, str]], temperature: float = 0.1) -> str:
        if not self.client:
            raise RuntimeError("LLM_API_KEY is not configured")

        response = self.client.chat.completions.create(
            model=self.settings.llm_model,
            messages=messages,
            temperature=temperature,
        )
        if not getattr(response, "choices", None):
            raise RuntimeError("LLM response did not include choices")
        content = response.choices[0].message.content
        return content or ""

    def complete_json(self, messages: list[dict[str, str]], fallback: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            return fallback

        try:
            try:
                response = self.client.chat.completions.create(
                    model=self.settings.llm_model,
                    messages=messages,
                    temperature=0,
                    response_format={"type": "json_object"},
                )
            except Exception:
                response = self.client.chat.completions.create(
                    model=self.settings.llm_model,
                    messages=messages,
                    temperature=0,
                )
            if not getattr(response, "choices", None):
                return fallback
            content = response.choices[0].message.content or "{}"
        except Exception:
            return fallback

        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            return fallback
        return parsed if isinstance(parsed, dict) else fallback
