from __future__ import annotations

import json

from anthropic import Anthropic

from app.database import get_settings

HINT_MULTIPLIERS = {1: 0.85, 2: 0.7, 3: 0.55}


def _fallback_hints(lat: float, lng: float) -> list[str]:
    continent = "Europe" if 35 <= lat <= 72 and -25 <= lng <= 45 else "another continent"
    country = "Romania" if 43.5 <= lat <= 48.5 and 20 <= lng <= 30 else "a country with Street View coverage"
    city = "the nearest city or region visible from signage and road layout"
    return [
        f"The panorama is in {continent}.",
        f"The country is likely {country}.",
        f"Look for clues pointing toward {city}.",
    ]


def _parse_hints(text: str) -> list[str]:
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1:
        raise ValueError("Hint response did not contain JSON")
    parsed = json.loads(text[start : end + 1])
    return [str(item) for item in parsed[:3]]


async def progressive_hint(lat: float, lng: float, used_levels: int) -> dict[str, float | int | str]:
    level = min(3, used_levels + 1)
    settings = get_settings()
    hints = _fallback_hints(lat, lng)
    if settings.anthropic_api_key:
        try:
            client = Anthropic(api_key=settings.anthropic_api_key)
            message = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=450,
                temperature=0.1,
                system=(
                    "You are the Hint Agent for an AI GeoGuessr-like game. Given coordinates, infer "
                    "likely visual clues from road signs, language, architecture, vegetation, road "
                    "markings, and license plates. Return only a JSON array of exactly three strings: "
                    "level 1 continent, level 2 country, level 3 region/city. No coordinates."
                ),
                messages=[{"role": "user", "content": f"Coordinates: {lat}, {lng}"}],
            )
            hints = _parse_hints(message.content[0].text if message.content else "[]")
        except Exception:
            hints = _fallback_hints(lat, lng)
    titles = {1: "Continental clue", 2: "Country clue", 3: "Regional clue"}
    return {
        "level": level,
        "title": titles[level],
        "hint": hints[level - 1],
        "max_score_multiplier": HINT_MULTIPLIERS[level],
    }
