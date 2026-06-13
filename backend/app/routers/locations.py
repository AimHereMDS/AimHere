from __future__ import annotations

import asyncio
import random

from fastapi import APIRouter, Depends, HTTPException

from app.agents.curator_agent import curate_locations
from app.agents.geo import random_land_coordinate
from app.agents.hint_agent import progressive_hint
from app.agents.street_view import nearest_street_view_coordinate
from app.schemas import Coordinate, HintRequest, HintResponse, LocationRequest, LocationResponse
from app.security import get_current_user_payload

router = APIRouter(prefix="/locations", tags=["locations"])

RANDOM_STREET_VIEW_BATCH_SIZE = 5
RANDOM_STREET_VIEW_ATTEMPTS_PER_LOCATION = 3

WORLD_FALLBACK_LOCATIONS: tuple[Coordinate, ...] = (
    Coordinate(lat=48.8584, lng=2.2945, label="Paris"),
    Coordinate(lat=40.6892, lng=-74.0445, label="New York City"),
    Coordinate(lat=35.6762, lng=139.6503, label="Tokyo"),
    Coordinate(lat=51.5074, lng=-0.1278, label="London"),
    Coordinate(lat=-33.8568, lng=151.2153, label="Sydney"),
    Coordinate(lat=41.8902, lng=12.4922, label="Rome"),
    Coordinate(lat=1.3521, lng=103.8198, label="Singapore"),
    Coordinate(lat=52.5163, lng=13.3777, label="Berlin"),
    Coordinate(lat=37.8199, lng=-122.4783, label="San Francisco"),
    Coordinate(lat=-22.9519, lng=-43.2105, label="Rio de Janeiro"),
)


def _coordinate_key(point: Coordinate) -> tuple[float, float]:
    return (round(point.lat, 5), round(point.lng, 5))


def _fallback_world_locations(count: int, existing: list[Coordinate]) -> list[Coordinate]:
    fallback = list(WORLD_FALLBACK_LOCATIONS)
    random.shuffle(fallback)
    used = {_coordinate_key(point) for point in existing}
    selected: list[Coordinate] = []
    for point in fallback:
        if _coordinate_key(point) in used:
            continue
        selected.append(point)
        if len(selected) == count:
            break
    return selected


async def random_street_view_locations(count: int = 5) -> list[Coordinate]:
    locations: list[Coordinate] = []
    attempts = 0
    max_attempts = count * RANDOM_STREET_VIEW_ATTEMPTS_PER_LOCATION
    seen: set[tuple[float, float]] = set()
    while len(locations) < count and attempts < max_attempts:
        batch_size = min(RANDOM_STREET_VIEW_BATCH_SIZE, count - len(locations), max_attempts - attempts)
        candidates = [random_land_coordinate() for _ in range(batch_size)]
        attempts += len(candidates)
        results = await asyncio.gather(
            *(
                nearest_street_view_coordinate(lat, lng, radius=50000, label="Random Street View")
                for lat, lng in candidates
            ),
            return_exceptions=True,
        )
        for snapped in results:
            if isinstance(snapped, Exception) or snapped is None:
                continue
            key = _coordinate_key(snapped)
            if key in seen:
                continue
            seen.add(key)
            locations.append(snapped)
            if len(locations) == count:
                break
    if len(locations) < count:
        locations.extend(_fallback_world_locations(count - len(locations), locations))
    return locations[:count]


@router.post("", response_model=LocationResponse)
async def create_locations(
    request: LocationRequest,
    _: dict = Depends(get_current_user_payload),
) -> LocationResponse:
    if request.mode == "default":
        return LocationResponse(locations=await random_street_view_locations(request.count))
    description = request.filter_text or request.mode
    if not description.strip():
        raise HTTPException(status_code=400, detail="A custom filter description is required")
    return LocationResponse(locations=await curate_locations(description, request.count))


@router.post("/hint", response_model=HintResponse)
async def hint(request: HintRequest, _: dict = Depends(get_current_user_payload)) -> dict:
    return await progressive_hint(request.lat, request.lng, request.used_levels, request.view)
