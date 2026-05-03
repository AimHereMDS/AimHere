from __future__ import annotations

import math
import random

EARTH_RADIUS_KM = 6371.0088


def haversine_km(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    lat1 = math.radians(a_lat)
    lat2 = math.radians(b_lat)
    d_lat = lat2 - lat1
    d_lng = math.radians(b_lng - a_lng)
    h = math.sin(d_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(d_lng / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(h))


def score_from_distance(distance_km: float, hints_used: int = 0) -> int:
    raw = 5000 * math.exp(-distance_km / 1800)
    multiplier = max(0.55, 1 - hints_used * 0.15)
    return max(0, min(5000, round(raw * multiplier)))


def coordinate_with_offset(lat: float, lng: float, distance_km: float, bearing_deg: float) -> tuple[float, float]:
    bearing = math.radians(bearing_deg)
    lat1 = math.radians(lat)
    lng1 = math.radians(lng)
    angular = distance_km / EARTH_RADIUS_KM
    lat2 = math.asin(
        math.sin(lat1) * math.cos(angular)
        + math.cos(lat1) * math.sin(angular) * math.cos(bearing)
    )
    lng2 = lng1 + math.atan2(
        math.sin(bearing) * math.sin(angular) * math.cos(lat1),
        math.cos(angular) - math.sin(lat1) * math.sin(lat2),
    )
    out_lng = (math.degrees(lng2) + 540) % 360 - 180
    return max(-85, min(85, math.degrees(lat2))), out_lng


def random_land_coordinate() -> tuple[float, float]:
    # Weighted toward populated latitude bands with high Street View coverage.
    regions = [
        (35, 60, -125, -65),
        (35, 70, -10, 35),
        (-45, -10, 110, 155),
        (20, 45, 120, 145),
        (-40, -20, -75, -45),
        (5, 25, 95, 120),
    ]
    min_lat, max_lat, min_lng, max_lng = random.choice(regions)
    return random.uniform(min_lat, max_lat), random.uniform(min_lng, max_lng)

