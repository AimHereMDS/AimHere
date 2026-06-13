import pytest

from app.routers import locations as locations_router
from app.schemas import Coordinate


@pytest.mark.asyncio
async def test_random_street_view_locations_falls_back_after_bounded_attempts(monkeypatch):
    calls = 0

    def fake_random_land_coordinate() -> tuple[float, float]:
        return (0.0, 0.0)

    async def fake_nearest_street_view_coordinate(*args, **kwargs):
        nonlocal calls
        calls += 1
        return None

    monkeypatch.setattr(locations_router, "random_land_coordinate", fake_random_land_coordinate)
    monkeypatch.setattr(locations_router, "nearest_street_view_coordinate", fake_nearest_street_view_coordinate)
    monkeypatch.setattr(locations_router.random, "shuffle", lambda items: None)

    result = await locations_router.random_street_view_locations(5)

    assert calls == 5 * locations_router.RANDOM_STREET_VIEW_ATTEMPTS_PER_LOCATION
    assert len(result) == 5
    assert [point.label for point in result] == ["Paris", "New York City", "Tokyo", "London", "Sydney"]


@pytest.mark.asyncio
async def test_random_street_view_locations_returns_verified_candidates(monkeypatch):
    calls: list[tuple[float, float]] = []
    next_index = 0

    def fake_random_land_coordinate() -> tuple[float, float]:
        nonlocal next_index
        index = next_index
        next_index += 1
        return (float(index), float(index + 10))

    async def fake_nearest_street_view_coordinate(lat, lng, **kwargs):
        calls.append((lat, lng))
        return Coordinate(lat=lat + 0.25, lng=lng + 0.25, label=kwargs.get("label"))

    monkeypatch.setattr(locations_router, "random_land_coordinate", fake_random_land_coordinate)
    monkeypatch.setattr(locations_router, "nearest_street_view_coordinate", fake_nearest_street_view_coordinate)

    result = await locations_router.random_street_view_locations(5)

    assert len(calls) == 5
    assert len(result) == 5
    assert all(point.label == "Random Street View" for point in result)
