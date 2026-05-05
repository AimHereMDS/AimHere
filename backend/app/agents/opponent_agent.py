from __future__ import annotations

import hashlib
import json
import logging
import random

from anthropic import Anthropic

from app.agents.geo import coordinate_with_offset
from app.agents.street_view import street_view_static_image
from app.database import get_settings
from app.schemas import PanoramaView

logger = logging.getLogger(__name__)

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


def _parse_visual_guess(text: str) -> tuple[float, float, str] | None:
    try:
        start = text.find("{")
        end = text.rfind("}")
        parsed = json.loads(text[start : end + 1])
        guess_lat = float(parsed["lat"])
        guess_lng = float(parsed["lng"])
        explanation = str(parsed.get("explanation") or "").strip()
    except Exception:
        return None
    if not -90 <= guess_lat <= 90 or not -180 <= guess_lng <= 180 or not explanation:
        return None
    return guess_lat, guess_lng, explanation


async def opponent_guess(
    lat: float,
    lng: float,
    difficulty: str = "medium",
    view: PanoramaView | None = None,
) -> dict[str, str | float]:
    difficulty = difficulty if difficulty in DIFFICULTY_RANGES_KM else "medium"
    guess_lat, guess_lng, _ = _deterministic_noise(lat, lng, difficulty)
    explanation = (
        "Visual panorama context was unavailable, so this fallback guess used the configured "
        f"{difficulty} difficulty without scene-specific visual reasoning."
    )
    settings = get_settings()
    if settings.anthropic_api_key:
        try:
            image_lat = view.lat if view else lat
            image_lng = view.lng if view else lng
            image = await street_view_static_image(
                image_lat,
                image_lng,
                heading=view.heading if view else None,
                pitch=view.pitch if view else None,
                fov=view.fov if view else None,
                pano_id=view.pano_id if view else None,
            )
            if not image:
                raise ValueError("No Street View image available for visual opponent guess")
            content: list[dict] = [
                {
                    "type": "text",
                    "text": (
                        f"Difficulty: {difficulty}. You are looking at a Street View frame and must "
                        "place a map guess from visual evidence only. Easy means a rough regional guess, "
                        "medium means a balanced country/region guess, and hard means your strongest "
                        "visual estimate. Use clues such as visible text, web domains like .ro, language, "
                        "diacritics, signs, license plates, road markings, poles, bollards, architecture, "
                        "vegetation, terrain, and driving side. Do not use or mention coordinates, hidden "
                        "metadata, labels, or the correct answer."
                    ),
                }
            ]
            content.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": image["media_type"],
                        "data": image["data"],
                    },
                }
            )
            client = Anthropic(api_key=settings.anthropic_api_key)
            message = client.messages.create(
                model=settings.anthropic_model,
                max_tokens=350,
                temperature=0.2,
                system=(
                    "You are the visual Opponent Agent in a GeoGuessr-like PvE match. You do not know "
                    "the real coordinates. You see only the same Street View frame as the player and "
                    "must estimate a map pin from visible evidence. Return only JSON with lat, lng, and "
                    "explanation fields. The explanation must cite visible clues and uncertainty, not "
                    "metadata or hidden coordinates."
                ),
                messages=[{"role": "user", "content": content}],
            )
            visual_guess = _parse_visual_guess(message.content[0].text if message.content else "")
            if visual_guess:
                guess_lat, guess_lng, explanation = visual_guess
            else:
                explanation = _parse_explanation(message.content[0].text if message.content else "") or explanation
        except Exception as exc:
            logger.warning("Opponent Agent fell back to deterministic guess: %s", exc)
    return {
        "lat": guess_lat,
        "lng": guess_lng,
        "difficulty": difficulty,
        "explanation": explanation,
    }
