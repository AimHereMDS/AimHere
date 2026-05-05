from __future__ import annotations

import base64
from typing import TypedDict

import httpx

from app.database import get_settings
from app.schemas import Coordinate


class StreetViewImage(TypedDict):
    media_type: str
    data: str


async def nearest_street_view_coordinate(
    lat: float,
    lng: float,
    radius: int = 50000,
    label: str | None = None,
) -> Coordinate | None:
    settings = get_settings()
    if not settings.google_maps_api_key:
        return Coordinate(lat=lat, lng=lng, label=label)

    params = {
        "location": f"{lat},{lng}",
        "radius": radius,
        "source": "outdoor",
        "key": settings.google_maps_api_key,
    }
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get("https://maps.googleapis.com/maps/api/streetview/metadata", params=params)
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPError:
        return None

    if payload.get("status") != "OK":
        return None
    location = payload.get("location") or {}
    out_lat = location.get("lat")
    out_lng = location.get("lng")
    if not isinstance(out_lat, (int, float)) or not isinstance(out_lng, (int, float)):
        return Coordinate(lat=lat, lng=lng, label=label)
    return Coordinate(lat=float(out_lat), lng=float(out_lng), label=label)


async def street_view_static_image(
    lat: float,
    lng: float,
    heading: float | None = None,
    pitch: float | None = None,
    fov: float | None = None,
    pano_id: str | None = None,
) -> StreetViewImage | None:
    settings = get_settings()
    if not settings.google_maps_api_key:
        return None

    params = {
        "size": "640x400",
        "fov": round(fov, 2) if fov is not None else 90,
        "source": "outdoor",
        "key": settings.google_maps_api_key,
    }
    if pano_id:
        params["pano"] = pano_id
    else:
        params["location"] = f"{lat},{lng}"
    if heading is not None:
        params["heading"] = round(heading % 360, 2)
    if pitch is not None:
        params["pitch"] = round(pitch, 2)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get("https://maps.googleapis.com/maps/api/streetview", params=params)
            response.raise_for_status()
            sv_status = response.headers.get("X-Google-Street-View-Status", "OK")
            if sv_status != "OK":
                return None
            content_type = response.headers.get("content-type", "image/jpeg").split(";")[0]
            if not content_type.startswith("image/"):
                return None
            return {
                "media_type": content_type,
                "data": base64.b64encode(response.content).decode("ascii"),
            }
    except httpx.HTTPError:
        return None
