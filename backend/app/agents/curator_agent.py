from __future__ import annotations

import json
import random
from typing import Any

import httpx
from anthropic import Anthropic

from app.database import get_settings
from app.schemas import Coordinate

REGION_BOUNDS: dict[str, tuple[float, float, float, float]] = {
    "romania": (43.6, 48.4, 20.2, 29.8),
    "europe": (35.0, 71.0, -10.5, 40.5),
    "asia": (-10.0, 55.0, 25.0, 150.0),
    "north america": (24.0, 60.0, -130.0, -60.0),
    "south america": (-55.0, 13.0, -82.0, -35.0),
    "africa": (-35.0, 35.0, -18.0, 52.0),
    "australia": (-44.0, -10.0, 112.0, 154.0),
}

FALLBACK_POINTS: dict[str, list[Coordinate]] = {
    "romania": [
        Coordinate(lat=44.4268, lng=26.1025, label="Bucharest"),
        Coordinate(lat=46.7712, lng=23.6236, label="Cluj-Napoca"),
        Coordinate(lat=45.6427, lng=25.5887, label="Brasov"),
        Coordinate(lat=47.1585, lng=27.6014, label="Iasi"),
        Coordinate(lat=45.7489, lng=21.2087, label="Timisoara"),
    ],
    "famous": [
        Coordinate(lat=48.8584, lng=2.2945, label="Eiffel Tower"),
        Coordinate(lat=40.6892, lng=-74.0445, label="Statue of Liberty"),
        Coordinate(lat=27.1751, lng=78.0421, label="Taj Mahal"),
        Coordinate(lat=-22.9519, lng=-43.2105, label="Christ the Redeemer"),
        Coordinate(lat=41.8902, lng=12.4922, label="Colosseum"),
    ],
    "asia": [
        Coordinate(lat=35.6762, lng=139.6503, label="Tokyo"),
        Coordinate(lat=37.5665, lng=126.9780, label="Seoul"),
        Coordinate(lat=1.3521, lng=103.8198, label="Singapore"),
        Coordinate(lat=13.7563, lng=100.5018, label="Bangkok"),
        Coordinate(lat=25.2048, lng=55.2708, label="Dubai"),
    ],
}


def _fallback_for_query(query: str, count: int) -> list[Coordinate]:
    normalized = query.lower()
    key = "famous" if "famous" in normalized or "landmark" in normalized else None
    for candidate in REGION_BOUNDS:
        if candidate in normalized:
            key = candidate
            break
    if "big cities in asia" in normalized:
        key = "asia"
    points = FALLBACK_POINTS.get(key or "famous", FALLBACK_POINTS["famous"])
    return points[:count]


def _extract_json(text: str) -> list[dict[str, Any]]:
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1:
        raise ValueError("Curator response did not contain a JSON list")
    return json.loads(text[start : end + 1])


async def has_street_view_coverage(lat: float, lng: float) -> bool:
    settings = get_settings()
    if not settings.google_maps_api_key:
        return True
    params = {
        "location": f"{lat},{lng}",
        "radius": 500,
        "source": "outdoor",
        "key": settings.google_maps_api_key,
    }
    async with httpx.AsyncClient(timeout=8) as client:
        response = await client.get("https://maps.googleapis.com/maps/api/streetview/metadata", params=params)
        response.raise_for_status()
        return response.json().get("status") == "OK"


async def curate_locations(description: str, count: int = 5) -> list[Coordinate]:
    settings = get_settings()
    if not settings.anthropic_api_key:
        return _fallback_for_query(description, count)

    client = Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=900,
        temperature=0.2,
        system=(
            "You are the Curator Agent for a GeoGuessr-like game. Return only JSON: "
            "[{\"lat\": number, \"lng\": number, \"label\": string}]. Choose public outdoor "
            "locations likely to have Google Street View coverage. Do not include prose."
        ),
        messages=[
            {
                "role": "user",
                "content": f"Find {count} diverse playable coordinates matching: {description}",
            }
        ],
    )
    raw = message.content[0].text if message.content else "[]"
    parsed = [Coordinate(**item) for item in _extract_json(raw)]
    verified: list[Coordinate] = []
    for point in parsed:
        if await has_street_view_coverage(point.lat, point.lng):
            verified.append(point)
        if len(verified) == count:
            break
    if len(verified) < count:
        for point in _fallback_for_query(description, count):
            if point not in verified:
                verified.append(point)
            if len(verified) == count:
                break
    random.shuffle(verified)
    return verified[:count]
