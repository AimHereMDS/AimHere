import pytest

from app.agents.geo import haversine_km
from app.agents.opponent_agent import opponent_guess


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
