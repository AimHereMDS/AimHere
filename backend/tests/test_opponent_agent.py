from types import SimpleNamespace

import pytest

from app.database import get_settings
from app.agents.geo import haversine_km
from app.agents.opponent_agent import _deterministic_noise, _parse_visual_guess, opponent_guess
from app.schemas import PanoramaView


@pytest.fixture(autouse=True)
def clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def patch_visual_opponent(monkeypatch, response_text: str, captured: dict[str, object] | None = None):
    captured = captured if captured is not None else {}
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
            return SimpleNamespace(content=[SimpleNamespace(text=response_text)])

    class FakeAnthropic:
        def __init__(self, api_key):
            self.messages = FakeMessages()

    monkeypatch.setattr("app.agents.opponent_agent.street_view_static_image", fake_street_view_static_image)
    monkeypatch.setattr("app.agents.opponent_agent.Anthropic", FakeAnthropic)
    return captured


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
    patch_visual_opponent(
        monkeypatch,
        (
            '{"lat": 45.0, "lng": 25.0, '
            '"explanation": "A .ro sign and Romanian-looking road furniture suggest Romania, but the exact city is uncertain."}'
        ),
        captured,
    )

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


@pytest.mark.parametrize(
    "response_text",
    [
        "not json at all",
        '{"lat": 45.0, "explanation": "Missing longitude should not be accepted."}',
        '{"lng": 25.0, "explanation": "Missing latitude should not be accepted."}',
        '{"lat": 45.0, "lng": 25.0}',
        '{"lat": 95.0, "lng": 25.0, "explanation": "Latitude is outside valid bounds."}',
        '{"lat": 45.0, "lng": -181.0, "explanation": "Longitude is outside valid bounds."}',
    ],
)
def test_parse_visual_guess_rejects_malformed_partial_and_out_of_bounds(response_text):
    assert _parse_visual_guess(response_text) is None


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "response_text",
    [
        '{"lng": 25.0, "explanation": "Claude explanation must not be reused without latitude."}',
        '{"lat": 95.0, "lng": 25.0, "explanation": "Claude explanation must not be reused out of bounds."}',
        "not valid json",
    ],
)
async def test_opponent_agent_invalid_visual_guess_keeps_generic_fallback(monkeypatch, response_text):
    patch_visual_opponent(monkeypatch, response_text)
    real = (48.8584, 2.2945)
    expected_lat, expected_lng, _ = _deterministic_noise(real[0], real[1], "medium")

    guess = await opponent_guess(real[0], real[1], "medium", PanoramaView(lat=1.23, lng=4.56))

    assert guess["lat"] == expected_lat
    assert guess["lng"] == expected_lng
    assert "fallback guess used the configured medium difficulty" in str(guess["explanation"])
    assert "Claude explanation" not in str(guess["explanation"])


@pytest.mark.asyncio
async def test_visual_guess_keeps_easy_and_medium_in_difficulty_ranges(monkeypatch):
    patch_visual_opponent(
        monkeypatch,
        (
            '{"lat": 48.8584, "lng": 2.2945, '
            '"explanation": "The Eiffel Tower and French road signs point to central Paris."}'
        ),
    )
    real = (48.8584, 2.2945)
    view = PanoramaView(lat=1.23, lng=4.56)

    hard = await opponent_guess(real[0], real[1], "hard", view)
    medium = await opponent_guess(real[0], real[1], "medium", view)
    easy = await opponent_guess(real[0], real[1], "easy", view)

    hard_distance = haversine_km(real[0], real[1], float(hard["lat"]), float(hard["lng"]))
    medium_distance = haversine_km(real[0], real[1], float(medium["lat"]), float(medium["lng"]))
    easy_distance = haversine_km(real[0], real[1], float(easy["lat"]), float(easy["lng"]))

    assert hard["lat"] == 48.8584
    assert hard["lng"] == 2.2945
    assert 180 <= medium_distance <= 850
    assert 900 <= easy_distance <= 2800
    assert hard_distance < medium_distance < easy_distance
    assert "French road signs" in str(easy["explanation"])
    assert "French road signs" in str(medium["explanation"])
