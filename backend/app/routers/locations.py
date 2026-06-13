from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.agents.curator_agent import curate_locations
from app.agents.geo import random_land_coordinate
from app.agents.hint_agent import progressive_hint
from app.agents.street_view import nearest_street_view_coordinate
from app.schemas import Coordinate, HintRequest, HintResponse, LocationRequest, LocationResponse
from app.security import get_current_user_payload

router = APIRouter(prefix="/locations", tags=["locations"])


async def random_street_view_locations(count: int = 5) -> list[Coordinate]:
    import asyncio

    async def _try_random() -> Coordinate | None:
        lat, lng = random_land_coordinate()
        return await nearest_street_view_coordinate(lat, lng, radius=50000, label="Random Street View")

    locations: list[Coordinate] = []
    for _ in range(6):
        if len(locations) >= count:
            break
        needed = count - len(locations)
        batch = await asyncio.gather(*[_try_random() for _ in range(needed * 3)])
        locations.extend(c for c in batch if c is not None)

    if len(locations) < count:
        locations.extend(await curate_locations("diverse world cities", count - len(locations)))
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
