from types import SimpleNamespace

import pytest

from app.agents.base_agent import ClaudeAgent
from app.database import Settings


class ModelNotFoundError(Exception):
    status_code = 404


class AssistantPrefillError(Exception):
    status_code = 400


@pytest.mark.asyncio
async def test_claude_agent_retries_model_not_found_with_fallback():
    calls: list[str] = []

    class FakeMessages:
        async def create(self, **kwargs):
            calls.append(kwargs["model"])
            if kwargs["model"] == "missing-model":
                raise ModelNotFoundError("model: missing-model")
            return SimpleNamespace(content=[SimpleNamespace(text="[]")])

    class FakeClient:
        def __init__(self, **kwargs):
            self.messages = FakeMessages()

    agent = ClaudeAgent(
        "Test Agent",
        settings=Settings(
            anthropic_api_key="test-key",
            anthropic_model="missing-model",
            anthropic_model_fallbacks="fallback-model",
        ),
        client_factory=FakeClient,
    )

    result = await agent.call_claude(
        system="system",
        messages=[{"role": "user", "content": "hello"}],
        max_tokens=10,
        temperature=0,
    )

    assert result == "[]"
    assert calls == ["missing-model", "fallback-model"]


@pytest.mark.asyncio
async def test_claude_agent_does_not_retry_non_model_errors():
    calls: list[str] = []

    class FakeMessages:
        async def create(self, **kwargs):
            calls.append(kwargs["model"])
            raise RuntimeError("quota exceeded")

    class FakeClient:
        def __init__(self, **kwargs):
            self.messages = FakeMessages()

    agent = ClaudeAgent(
        "Test Agent",
        settings=Settings(
            anthropic_api_key="test-key",
            anthropic_model="primary-model",
            anthropic_model_fallbacks="fallback-model",
        ),
        client_factory=FakeClient,
    )

    with pytest.raises(RuntimeError, match="quota exceeded"):
        await agent.call_claude(
            system="system",
            messages=[{"role": "user", "content": "hello"}],
            max_tokens=10,
            temperature=0,
        )

    assert calls == ["primary-model"]


@pytest.mark.asyncio
async def test_claude_agent_retries_without_assistant_prefill():
    call_messages: list[list[dict]] = []

    class FakeMessages:
        async def create(self, **kwargs):
            call_messages.append(kwargs["messages"])
            if kwargs["messages"][-1]["role"] == "assistant":
                raise AssistantPrefillError("This model does not support assistant message prefill")
            return SimpleNamespace(content=[SimpleNamespace(text='["hint"]')])

    class FakeClient:
        def __init__(self, **kwargs):
            self.messages = FakeMessages()

    agent = ClaudeAgent(
        "Test Agent",
        settings=Settings(
            anthropic_api_key="test-key",
            anthropic_model="primary-model",
            anthropic_model_fallbacks="fallback-model",
        ),
        client_factory=FakeClient,
    )

    result = await agent.call_claude(
        system="system",
        messages=[
            {"role": "user", "content": "hello"},
            {"role": "assistant", "content": "["},
        ],
        max_tokens=10,
        temperature=0,
    )

    assert result == '["hint"]'
    assert [message[-1]["role"] for message in call_messages] == ["assistant", "user"]
