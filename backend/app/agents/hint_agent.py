from __future__ import annotations

import json
import logging

from anthropic import Anthropic

from app.database import get_settings
from app.schemas import PanoramaView
from app.agents.street_view import street_view_static_image

logger = logging.getLogger(__name__)

HINT_MULTIPLIERS = {1: 0.85, 2: 0.7, 3: 0.55}
HINT_TITLES = {1: "Hint 1", 2: "Hint 2", 3: "Hint 3"}


def _fallback_hints() -> list[str]:
    return [
        "Start with visible low-spoiler clues: readable text, alphabets, road signs, lane direction, and plate colors.",
        "Combine the clearest road furniture, markings, vegetation, architecture, and sign style into a stronger regional guess.",
        "Use the most specific visible clue, such as a web domain, town name, unique sign design, or distinctive architecture, to narrow the place further.",
    ]


def _parse_hints(text: str) -> list[str]:
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1:
        raise ValueError("Hint response did not contain JSON")
    parsed = json.loads(text[start : end + 1])
    hints = [str(item) for item in parsed[:3] if str(item).strip()]
    if len(hints) != 3:
        raise ValueError("Hint response did not contain exactly three hints")
    return hints


async def progressive_hint(
    lat: float,
    lng: float,
    used_levels: int,
    view: PanoramaView | None = None,
) -> dict[str, float | int | str]:
    level = min(3, used_levels + 1)
    settings = get_settings()
    hints = _fallback_hints()
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
                raise ValueError("No Street View image available for visual hinting")
            content: list[dict] = [
                {
                    "type": "text",
                    "text": (
                        "Analyze this Street View frame exactly like a player looking at the panorama. "
                        "Use only visual evidence visible in the image. Return three hints ordered by "
                        "usefulness, not by fixed categories: the first should be helpful but not too "
                        "direct, the second should be more specific, and the third should be the strongest "
                        "visual clue you can give without using hidden information. "
                        "Good evidence includes visible text, web domains such as .ro, language, "
                        "diacritics, road signs, license plates, lane markings, bollards, poles, "
                        "architecture, vegetation, terrain, and driving side. If evidence is weak, "
                        "state uncertainty. Do not use or mention coordinates, hidden metadata, labels, "
                        "or any fixed continent/country/region template. Do not label the hints as "
                        "continent, country, region, visible, pattern, or narrowing categories."
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
                max_tokens=450,
                temperature=0.1,
                system=(
                    "You are the visual Hint Agent for a GeoGuessr-like game. You see only the same "
                    "Street View frame as the player. Never rely on coordinates, metadata, labels, or "
                    "the correct answer. Reason from visible clues such as text, domains, signs, plates, "
                    "road furniture, architecture, vegetation, terrain, and road layout. Return only a "
                    "JSON array of exactly three strings ordered from useful to stronger to strongest. "
                    "Do not organize them into named categories; each string must cite the visual clue "
                    "and the inference a player could make from it."
                ),
                messages=[{"role": "user", "content": content}],
            )
            hints = _parse_hints(message.content[0].text if message.content else "[]")
        except Exception as exc:
            logger.warning("Hint Agent fell back to generic visual hints: %s", exc)
            hints = _fallback_hints()
    return {
        "level": level,
        "title": HINT_TITLES[level],
        "hint": hints[level - 1],
        "max_score_multiplier": HINT_MULTIPLIERS[level],
    }
