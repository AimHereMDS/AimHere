from __future__ import annotations

from collections.abc import Callable
from typing import Any

from anthropic import AsyncAnthropic

from app.database import Settings, get_settings


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
        message = await client.messages.create(
            model=self.settings.anthropic_model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system,
            messages=messages,
        )
        return message.content[0].text if message.content else ""
