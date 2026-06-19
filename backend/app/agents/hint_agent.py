from __future__ import annotations

import json
import logging

from anthropic import AsyncAnthropic

from app.agents.base_agent import ClaudeAgent
from app.schemas import PanoramaView
from app.agents.street_view import street_view_static_image

logger = logging.getLogger(__name__)

HINT_MULTIPLIERS = {1: 0.85, 2: 0.7, 3: 0.55}
HINT_TITLES = {1: "Hint 1", 2: "Hint 2", 3: "Hint 3"}


def _clean_source_prompt(source_prompt: str | None) -> str | None:
    cleaned = " ".join((source_prompt or "").split())
    if not cleaned:
        return None
    return cleaned[:300]


def _fallback_hints(source_prompt: str | None = None) -> list[str]:
    cleaned_prompt = _clean_source_prompt(source_prompt)
    if cleaned_prompt:
        return [
            f'This round was generated from "{cleaned_prompt}", so start by looking for visible clues that fit that theme without jumping straight to a country guess.',
            f'Use the "{cleaned_prompt}" theme to prioritize matching visual evidence: venue shape, nearby signs, public transport stops, branding, language, road furniture, and architecture.',
            "Try to read the most specific visible name, sponsor, web domain, street sign, or city clue near the themed location, then combine it with the language and surroundings.",
        ]
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


class HintAgent(ClaudeAgent):
    def __init__(self) -> None:
        super().__init__("Hint Agent", client_factory=AsyncAnthropic)

    async def progressive_hint(
        self,
        lat: float,
        lng: float,
        used_levels: int,
        view: PanoramaView | None = None,
        source_prompt: str | None = None,
    ) -> dict[str, float | int | str]:
        level = min(3, used_levels + 1)
        cleaned_source_prompt = _clean_source_prompt(source_prompt)
        hints = _fallback_hints(cleaned_source_prompt)
        if self.can_call_claude:
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
                source_context = (
                    f'The player-visible setup prompt for this location set is: "{cleaned_source_prompt}". '
                    "Use this only as category/theme context the player already chose; do not treat it as "
                    "the answer, and still ground every hint in visible evidence from the image. "
                    if cleaned_source_prompt
                    else ""
                )
                content: list[dict] = [
                    {
                        "type": "text",
                        "text": (
                            "Analyze this Street View frame exactly like a player looking at the panorama. "
                            f"{source_context}"
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
                raw_text = await self.call_claude(
                    max_tokens=600,
                    temperature=0.1,
                    system=(
                        "You are the visual Hint Agent for a GeoGuessr-like game. You see only the same "
                        "Street View frame as the player. Never rely on coordinates, metadata, labels, or "
                        "the correct answer. Reason from visible clues such as text, domains, signs, plates, "
                        "road furniture, architecture, vegetation, terrain, and road layout. Return ONLY a "
                        "JSON array of exactly three strings ordered from useful to stronger to strongest. "
                        "No prose, no preamble, no markdown fences. Do not organize them into named "
                        "categories; each string must cite the visual clue and the inference a player could "
                        "make from it."
                    ),
                    messages=[
                        {"role": "user", "content": content},
                    ],
                )
                if raw_text and not raw_text.lstrip().startswith("["):
                    raw_text = "[" + raw_text
                hints = _parse_hints(raw_text)
            except Exception as exc:
                logger.warning("Hint Agent fell back to generic visual hints: %s", exc)
                hints = _fallback_hints(cleaned_source_prompt)
        return {
            "level": level,
            "title": HINT_TITLES[level],
            "hint": hints[level - 1],
            "max_score_multiplier": HINT_MULTIPLIERS[level],
        }


async def progressive_hint(
    lat: float,
    lng: float,
    used_levels: int,
    view: PanoramaView | None = None,
    source_prompt: str | None = None,
) -> dict[str, float | int | str]:
    return await HintAgent().progressive_hint(lat, lng, used_levels, view, source_prompt)
