from __future__ import annotations

from collections.abc import Callable
import logging
from typing import Any

from anthropic import AsyncAnthropic

from app.database import Settings, get_settings

logger = logging.getLogger(__name__)


def _split_model_list(value: str) -> list[str]:
    seen: set[str] = set()
    models: list[str] = []
    for raw_model in value.split(","):
        model = raw_model.strip()
        if not model or model in seen:
            continue
        seen.add(model)
        models.append(model)
    return models


def _is_model_not_found_error(exc: Exception) -> bool:
    status_code = getattr(exc, "status_code", None)
    if status_code == 404:
        return True
    text = str(exc).lower()
    return "not_found_error" in text and "model" in text


def _is_assistant_prefill_error(exc: Exception) -> bool:
    status_code = getattr(exc, "status_code", None)
    if status_code != 400:
        return False
    text = str(exc).lower()
    return "assistant message prefill" in text or "conversation must end with a user message" in text


def _without_trailing_assistant_prefill(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if messages and messages[-1].get("role") == "assistant":
        return messages[:-1]
    return messages


class ClaudeAgent:
    def __init__(
        self,
        name: str,
        *,
        settings: Settings | None = None,
        client_factory: Callable[..., Any] = AsyncAnthropic,
    ) -> None:
        self.name = name
        self.settings = settings or get_settings()
        self.client_factory = client_factory

    @property
    def can_call_claude(self) -> bool:
        return bool(self.settings.anthropic_api_key)

    async def call_claude(
        self,
        *,
        system: str,
        messages: list[dict[str, Any]],
        max_tokens: int,
        temperature: float,
    ) -> str:
        if not self.can_call_claude:
            raise ValueError(f"{self.name} cannot call Claude without ANTHROPIC_API_KEY")

        client = self.client_factory(
            api_key=self.settings.anthropic_api_key,
            timeout=25.0,
            max_retries=1,
        )
        models = _split_model_list(
            ",".join([self.settings.anthropic_model, self.settings.anthropic_model_fallbacks])
        )
        last_error: Exception | None = None
        for index, model in enumerate(models):
            try:
                message = await client.messages.create(
                    model=model,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    system=system,
                    messages=messages,
                )
                return message.content[0].text if message.content else ""
            except Exception as exc:
                stripped_messages = _without_trailing_assistant_prefill(messages)
                if _is_assistant_prefill_error(exc) and stripped_messages != messages:
                    logger.warning(
                        "%s model %s rejected assistant prefill; retrying without prefill",
                        self.name,
                        model,
                    )
                    message = await client.messages.create(
                        model=model,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        system=system,
                        messages=stripped_messages,
                    )
                    return message.content[0].text if message.content else ""
                if not _is_model_not_found_error(exc) or index == len(models) - 1:
                    raise
                last_error = exc
                logger.warning(
                    "%s model %s is unavailable; retrying with %s",
                    self.name,
                    model,
                    models[index + 1],
                )
        if last_error:
            raise last_error
        raise ValueError(f"{self.name} has no Anthropic model configured")
