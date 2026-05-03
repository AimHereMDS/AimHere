import pytest

from app.agents.hint_agent import progressive_hint


@pytest.mark.asyncio
async def test_hint_agent_returns_progressive_levels(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    first = await progressive_hint(44.4268, 26.1025, 0)
    second = await progressive_hint(44.4268, 26.1025, 1)
    third = await progressive_hint(44.4268, 26.1025, 2)

    assert first["level"] == 1
    assert second["level"] == 2
    assert third["level"] == 3
    assert first["max_score_multiplier"] > second["max_score_multiplier"] > third["max_score_multiplier"]
    assert all(isinstance(item["hint"], str) and item["hint"] for item in [first, second, third])

