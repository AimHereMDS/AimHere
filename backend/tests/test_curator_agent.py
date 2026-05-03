import pytest

from app.agents.curator_agent import REGION_BOUNDS, curate_locations


def within_bounds(lat: float, lng: float, bounds: tuple[float, float, float, float]) -> bool:
    min_lat, max_lat, min_lng, max_lng = bounds
    return min_lat <= lat <= max_lat and min_lng <= lng <= max_lng


@pytest.mark.asyncio
async def test_curator_agent_returns_romania_coordinates(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    locations = await curate_locations("Romania", count=5)
    assert len(locations) == 5
    assert all(within_bounds(point.lat, point.lng, REGION_BOUNDS["romania"]) for point in locations)


@pytest.mark.asyncio
async def test_curator_agent_returns_asia_city_coordinates(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    locations = await curate_locations("big cities in Asia", count=5)
    assert len(locations) == 5
    assert all(within_bounds(point.lat, point.lng, REGION_BOUNDS["asia"]) for point in locations)

