from types import SimpleNamespace

import pytest

from app.database import get_settings
from app.agents.hint_agent import progressive_hint
from app.schemas import PanoramaView


@pytest.fixture(autouse=True)
def clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


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


@pytest.mark.asyncio
async def test_hint_agent_uses_current_view_image_without_coordinates(monkeypatch):
    captured: dict[str, object] = {}
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

    async def fake_street_view_static_image(lat, lng, heading=None, pitch=None, fov=None, pano_id=None):
        captured["image_request"] = {
            "lat": lat,
            "lng": lng,
            "heading": heading,
            "pitch": pitch,
            "fov": fov,
            "pano_id": pano_id,
        }
        return {"media_type": "image/jpeg", "data": "abc123"}

    class FakeMessages:
        async def create(self, **kwargs):
            captured["anthropic_request"] = kwargs
            return SimpleNamespace(
                content=[
                    SimpleNamespace(
                        text=(
                            '["The storefront shows a .ro web domain, which points toward Romania.", '
                            '"The road signs and Latin alphabet fit southeastern Europe.", '
                            '"The architecture and utility poles narrow it toward an urban Romanian area."]'
                        )
                    )
                ]
            )

    class FakeAsyncAnthropic:
        def __init__(self, api_key, **kwargs):
            self.messages = FakeMessages()

    monkeypatch.setattr("app.agents.hint_agent.street_view_static_image", fake_street_view_static_image)
    monkeypatch.setattr("app.agents.hint_agent.AsyncAnthropic", FakeAsyncAnthropic)

    view = PanoramaView(lat=1.23, lng=4.56, pano_id="pano-123", heading=210.5, pitch=-4.0, fov=72)
    hint = await progressive_hint(44.4268, 26.1025, 0, view)

    assert hint["title"] == "Hint 1"
    assert ".ro" in str(hint["hint"])
    assert captured["image_request"] == {
        "lat": 1.23,
        "lng": 4.56,
        "heading": 210.5,
        "pitch": -4.0,
        "fov": 72,
        "pano_id": "pano-123",
    }

    request = captured["anthropic_request"]
    content = request["messages"][0]["content"]
    combined_prompt = f"{request['system']} {content[0]['text']}"
    for hidden_value in ("44.4268", "26.1025", "1.23", "4.56", "pano-123"):
        assert hidden_value not in combined_prompt
    assert "level 1 continent" not in combined_prompt.lower()
    assert "ordered by usefulness" in combined_prompt
    assert "do not organize them into named categories" in combined_prompt.lower()
    assert content[1]["type"] == "image"
