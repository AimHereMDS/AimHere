import pytest

from app.agents.geo import haversine_km, score_from_distance
from app.agents.opponent_agent import opponent_guess
from app.database import get_settings


FIXED_PANORAMA_SET = [
    (48.8584, 2.2945, "Paris landmark"),
    (35.6762, 139.6503, "Tokyo urban core"),
    (44.4268, 26.1025, "Bucharest city center"),
    (-33.8688, 151.2093, "Sydney harbor"),
    (40.7128, -74.0060, "New York grid"),
]


@pytest.fixture(autouse=True)
def clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_opponent_average_score_tracks_configured_difficulty(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    averages: dict[str, float] = {}

    for difficulty in ("easy", "medium", "hard"):
        scores = []
        for lat, lng, _label in FIXED_PANORAMA_SET:
            guess = await opponent_guess(lat, lng, difficulty)
            distance_km = haversine_km(lat, lng, float(guess["lat"]), float(guess["lng"]))
            scores.append(score_from_distance(distance_km, 0))
        averages[difficulty] = sum(scores) / len(scores)

    assert averages["hard"] > averages["medium"] > averages["easy"]
    assert averages["hard"] >= 4300
    assert averages["medium"] >= 2900
    assert averages["easy"] <= 2300
