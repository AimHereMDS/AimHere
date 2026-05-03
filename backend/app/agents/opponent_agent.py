from __future__ import annotations

import hashlib
import json
import random

from anthropic import Anthropic

from app.agents.geo import coordinate_with_offset
from app.database import get_settings

DIFFICULTY_RANGES_KM = {
    "easy": (900, 2800),
    "medium": (180, 850),
    "hard": (15, 180),
}


def _deterministic_noise(lat: float, lng: float, difficulty: str) -> tuple[float, float, float]:
    min_km, max_km = DIFFICULTY_RANGES_KM.get(difficulty, DIFFICULTY_RANGES_KM["medium"])
    digest = hashlib.sha256(f"{lat:.5f}:{lng:.5f}:{difficulty}".encode()).hexdigest()
    seed = int(digest[:16], 16)
    rng = random.Random(seed)
    distance = rng.uniform(min_km, max_km)
    bearing = rng.uniform(0, 360)
    out_lat, out_lng = coordinate_with_offset(lat, lng, distance, bearing)
    return out_lat, out_lng, distance


def _parse_explanation(text: str) -> str:
    try:
        start = text.find("{")
        end = text.rfind("}")
        parsed = json.loads(text[start : end + 1])
        return str(parsed.get("explanation") or "")
    except Exception:
        return ""


async def opponent_guess(lat: float, lng: float, difficulty: str = "medium") -> dict[str, str | float]:
    difficulty = difficulty if difficulty in DIFFICULTY_RANGES_KM else "medium"
    guess_lat, guess_lng, _ = _deterministic_noise(lat, lng, difficulty)
    explanation = (
        f"{difficulty.title()} AI balanced broad regional clues with uncertainty and placed a "
        "guess near similar road, language, and landscape patterns."
    )
    settings = get_settings()
    if settings.anthropic_api_key:
        try:
            client = Anthropic(api_key=settings.anthropic_api_key)
            message = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=350,
                temperature=0.2,
                system=(
                    "You are the Opponent Agent in a GeoGuessr-like PvE match. Explain the visual "
                    "reasoning an AI player would use from a panorama. Return only JSON with an "
                    "explanation field. Do not reveal the exact real coordinates."
                ),
                messages=[
                    {
                        "role": "user",
                        "content": f"Panorama coordinates: {lat}, {lng}. Difficulty: {difficulty}.",
                    }
                ],
            )
            explanation = _parse_explanation(message.content[0].text if message.content else "") or explanation
        except Exception:
            pass
    return {
        "lat": guess_lat,
        "lng": guess_lng,
        "difficulty": difficulty,
        "explanation": explanation,
    }
