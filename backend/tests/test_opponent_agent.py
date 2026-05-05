from types import SimpleNamespace

import pytest

from app.database import get_settings
from app.agents.geo import haversine_km
from app.agents.opponent_agent import opponent_guess
from app.schemas import PanoramaView


@pytest.fixture(autouse=True)
def clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_opponent_agent_difficulty_distance_ranges(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    real = (48.8584, 2.2945)
    expected = {
        "easy": (900, 2800),
        "medium": (180, 850),
        "hard": (15, 180),
    }
    for difficulty, (minimum, maximum) in expected.items():
        guess = await opponent_guess(real[0], real[1], difficulty)
        distance = haversine_km(real[0], real[1], float(guess["lat"]), float(guess["lng"]))
        assert minimum <= distance <= maximum
        assert guess["explanation"]


@pytest.mark.asyncio
async def test_opponent_agent_guesses_from_image_without_real_coordinates(monkeypatch):
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
        def create(self, **kwargs):
            captured["anthropic_request"] = kwargs
            return SimpleNamespace(
                content=[
                    SimpleNamespace(
                        text=(
                            '{"lat": 45.0, "lng": 25.0, '
                            '"explanation": "A .ro sign and Romanian-looking road furniture suggest Romania, but the exact city is uncertain."}'
                        )
                    )
                ]
            )

    class FakeAnthropic:
        def __init__(self, api_key):
            self.messages = FakeMessages()

    monkeypatch.setattr("app.agents.opponent_agent.street_view_static_image", fake_street_view_static_image)
    monkeypatch.setattr("app.agents.opponent_agent.Anthropic", FakeAnthropic)

    view = PanoramaView(lat=1.23, lng=4.56, pano_id="pano-123", heading=210.5, pitch=-4.0, fov=72)
    guess = await opponent_guess(48.8584, 2.2945, "hard", view)

    assert guess["lat"] == 45.0
    assert guess["lng"] == 25.0
    assert ".ro" in str(guess["explanation"])
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
    for hidden_value in ("48.8584", "2.2945", "1.23", "4.56", "pano-123"):
        assert hidden_value not in combined_prompt
    assert "panorama coordinates" not in combined_prompt.lower()
    assert content[1]["type"] == "image"
