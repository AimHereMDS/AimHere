"""
US-15 – Hint Agent (detector) evals.

Verify that the visual clues extracted by the Hint Agent are
geographically accurate for a set of panoramas with known locations.

Each eval scenario defines:
  - A known location (lat, lng, city/label).
  - A fake Claude response that the Hint Agent would return for that
    panorama (simulating what a real call produces).
  - Required keywords that *must* appear in at least one of the three hints,
    proving the clue is relevant to the true location.
  - Forbidden keywords that must *not* appear, proving the agent does not
    leak hidden metadata or produce contradictory clues.

These tests run fully offline (no Anthropic or Google API keys needed).
"""

import re
from types import SimpleNamespace

import pytest

from app.agents.hint_agent import progressive_hint, _parse_hints, HINT_MULTIPLIERS
from app.database import get_settings
from app.schemas import PanoramaView


# ── Helpers ───────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _patch_hint_agent(monkeypatch, response_text: str, captured: dict[str, object] | None = None):
    """Wire up fake Anthropic + fake Street View image so the hint agent
    goes through its visual path without real API calls."""
    captured = captured if captured is not None else {}
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

    async def fake_street_view_static_image(lat, lng, heading=None, pitch=None, fov=None, pano_id=None):
        captured["image_request"] = {
            "lat": lat, "lng": lng,
            "heading": heading, "pitch": pitch, "fov": fov, "pano_id": pano_id,
        }
        return {"media_type": "image/jpeg", "data": "fakebase64data"}

    class FakeMessages:
        async def create(self, **kwargs):
            captured["anthropic_request"] = kwargs
            return SimpleNamespace(content=[SimpleNamespace(text=response_text)])

    class FakeAsyncAnthropic:
        def __init__(self, api_key, **kwargs):
            self.messages = FakeMessages()

    monkeypatch.setattr("app.agents.hint_agent.street_view_static_image", fake_street_view_static_image)
    monkeypatch.setattr("app.agents.hint_agent.AsyncAnthropic", FakeAsyncAnthropic)
    return captured


# ── Known-location eval scenarios ─────────────────────────────────────────────

EVAL_SCENARIOS = [
    {
        "id": "bucharest_romania",
        "lat": 44.4268,
        "lng": 26.1025,
        "label": "Bucharest, Romania",
        "claude_response": (
            '["The shop signs use Latin script with diacritics like ă and ț, and a banner '
            'displays a .ro web domain — this strongly suggests Romania.", '
            '"The road has narrow tram tracks embedded in asphalt with yellow-painted kerbs, '
            'a pattern common in central Bucharest.", '
            '"A visible street sign reads Calea Victoriei, one of the main boulevards in '
            'Bucharest, Romania."]'
        ),
        "required_keywords": ["romania", ".ro"],
        "forbidden_keywords": ["44.4268", "26.1025"],
    },
    {
        "id": "paris_france",
        "lat": 48.8584,
        "lng": 2.2945,
        "label": "Paris, France",
        "claude_response": (
            '["The visible text is in French, with accents like é and è on shop signs, '
            'and a boulangerie storefront confirms a Francophone country.", '
            '"Haussmann-style architecture with wrought-iron balconies and zinc roofs '
            'points toward central Paris.", '
            '"The Eiffel Tower is partially visible above the roofline, confirming '
            'a location near the 7th arrondissement of Paris."]'
        ),
        "required_keywords": ["french", "paris"],
        "forbidden_keywords": ["48.8584", "2.2945"],
    },
    {
        "id": "tokyo_japan",
        "lat": 35.6762,
        "lng": 139.6503,
        "label": "Tokyo, Japan",
        "claude_response": (
            '["Multiple shop signs use Japanese kanji and hiragana characters, and vending '
            'machines on the sidewalk are a strong indicator of Japan.", '
            '"The yellow tactile paving strips, narrow streets, and compact kei cars '
            'narrow the location to an urban Japanese setting.", '
            '"A visible train station sign reads 渋谷 (Shibuya), confirming the '
            'Shibuya district of Tokyo."]'
        ),
        "required_keywords": ["japan"],
        "forbidden_keywords": ["35.6762", "139.6503"],
    },
    {
        "id": "new_york_usa",
        "lat": 40.7580,
        "lng": -73.9855,
        "label": "Times Square, New York, USA",
        "claude_response": (
            '["The road signs are in English and the yellow taxi cabs with NYC Taxi '
            'livery suggest a location in New York City.", '
            '"Tall glass skyscrapers, bright digital billboards, and Broadway theater '
            'marquees are characteristic of the Times Square area.", '
            '"A visible street sign at the intersection reads W 42nd St & Broadway, '
            'confirming Times Square in Midtown Manhattan."]'
        ),
        "required_keywords": ["new york", "english"],
        "forbidden_keywords": ["40.7580", "-73.9855"],
    },
    {
        "id": "sydney_australia",
        "lat": -33.8688,
        "lng": 151.2093,
        "label": "Sydney, Australia",
        "claude_response": (
            '["Cars drive on the left side of the road and signs are in English with '
            'Australian-style speed limit roundels, pointing to Australia.", '
            '"The harbour waterfront and distinctive sail-shaped roofline of the Opera '
            'House are visible across the water.", '
            '"A ferry terminal sign reads Circular Quay, confirming the Sydney CBD '
            'waterfront area."]'
        ),
        "required_keywords": ["australia"],
        "forbidden_keywords": ["-33.8688", "151.2093"],
    },
    {
        "id": "rio_brazil",
        "lat": -22.9519,
        "lng": -43.2105,
        "label": "Rio de Janeiro, Brazil",
        "claude_response": (
            '["Signs are in Portuguese with Brazilian spelling conventions, and '
            'a pharmacy displays the green cross common in Brazil.", '
            '"Distinctive black-and-white wave-patterned sidewalks (calçadão) '
            'and tropical vegetation suggest the Rio de Janeiro coastline.", '
            '"The Christ the Redeemer statue is visible atop Corcovado mountain '
            'in the background, confirming Rio de Janeiro."]'
        ),
        "required_keywords": ["portuguese", "brazil"],
        "forbidden_keywords": ["-22.9519", "-43.2105"],
    },
]


# ── Eval: clue accuracy on known panoramas ────────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "scenario",
    EVAL_SCENARIOS,
    ids=[s["id"] for s in EVAL_SCENARIOS],
)
async def test_hint_clues_contain_required_location_keywords(monkeypatch, scenario):
    """For a panorama with a known location, verify that the extracted hints
    contain at least the required geographic keywords."""
    _patch_hint_agent(monkeypatch, scenario["claude_response"])

    view = PanoramaView(lat=0.0, lng=0.0, pano_id=f"pano-{scenario['id']}")
    hints = []
    for level in range(3):
        result = await progressive_hint(scenario["lat"], scenario["lng"], level, view)
        hints.append(result["hint"].lower())

    combined = " ".join(hints)
    for keyword in scenario["required_keywords"]:
        assert keyword.lower() in combined, (
            f"[{scenario['label']}] Required keyword '{keyword}' not found in any hint. "
            f"Hints: {hints}"
        )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "scenario",
    EVAL_SCENARIOS,
    ids=[s["id"] for s in EVAL_SCENARIOS],
)
async def test_hint_clues_do_not_leak_coordinates(monkeypatch, scenario):
    """Hints must never expose the real coordinates — that would be cheating.
    Checks multiple precision formats (e.g. 48.8584, 48.858, 48.86) to catch
    rounded or reformatted leaks."""
    _patch_hint_agent(monkeypatch, scenario["claude_response"])

    view = PanoramaView(lat=0.0, lng=0.0, pano_id=f"pano-{scenario['id']}")
    hints = []
    for level in range(3):
        result = await progressive_hint(scenario["lat"], scenario["lng"], level, view)
        hints.append(result["hint"])

    combined = " ".join(hints)
    # Check the exact forbidden strings
    for forbidden in scenario["forbidden_keywords"]:
        assert forbidden not in combined, (
            f"[{scenario['label']}] Forbidden value '{forbidden}' leaked into hints. "
            f"Hints: {hints}"
        )
    # Also check common alternate precisions (rounded to 2, 3, 4 decimals)
    for coord in (scenario["lat"], scenario["lng"]):
        for precision in (2, 3, 4):
            rounded = f"{coord:.{precision}f}"
            assert rounded not in combined, (
                f"[{scenario['label']}] Coordinate {rounded} (precision={precision}) "
                f"leaked into hints. Hints: {hints}"
            )
    # Regex: catch any number matching the integer part + decimal prefix
    for coord in (scenario["lat"], scenario["lng"]):
        int_part = str(int(abs(coord)))
        sign = "-" if coord < 0 else ""
        pattern = re.escape(sign) + re.escape(int_part) + r"\.\d{2,}"
        if re.search(pattern, combined):
            match = re.search(pattern, combined).group()
            # Only flag if the matched number is close to the real coordinate
            try:
                if abs(float(match) - coord) < 1.0:
                    pytest.fail(
                        f"[{scenario['label']}] Coordinate-like value '{match}' found "
                        f"in hints (real={coord}). Hints: {hints}"
                    )
            except ValueError:
                pass


# ── Eval: progressive quality — later hints are longer / more specific ────────

# Specific toponyms expected in hint 3 (the strongest, most specific hint)
HINT3_TOPONYMS = {
    "bucharest_romania": ["calea victoriei", "bucharest"],
    "paris_france": ["eiffel tower", "arrondissement", "paris"],
    "tokyo_japan": ["shibuya", "tokyo"],
    "new_york_usa": ["42nd", "broadway", "times square", "manhattan"],
    "sydney_australia": ["circular quay", "sydney"],
    "rio_brazil": ["corcovado", "rio de janeiro", "christ the redeemer"],
}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "scenario",
    EVAL_SCENARIOS,
    ids=[s["id"] for s in EVAL_SCENARIOS],
)
async def test_hint_progression_gets_more_specific(monkeypatch, scenario):
    """Hint 3 (the strongest visual clue) should contain at least one
    specific toponym (street, district, landmark) that hint 1 does not."""
    _patch_hint_agent(monkeypatch, scenario["claude_response"])

    view = PanoramaView(lat=0.0, lng=0.0, pano_id=f"pano-{scenario['id']}")
    hint_texts = []
    for level in range(3):
        result = await progressive_hint(scenario["lat"], scenario["lng"], level, view)
        hint_texts.append(result["hint"])

    hint1_lower = hint_texts[0].lower()
    hint3_lower = hint_texts[2].lower()
    expected_toponyms = HINT3_TOPONYMS[scenario["id"]]
    found_in_hint3 = [t for t in expected_toponyms if t in hint3_lower]
    assert found_in_hint3, (
        f"[{scenario['label']}] Hint 3 should contain at least one specific toponym "
        f"from {expected_toponyms}. Got: {hint_texts[2]!r}"
    )
    # Hint 3 must introduce at least one toponym NOT already present in hint 1
    new_in_hint3 = [t for t in found_in_hint3 if t not in hint1_lower]
    assert new_in_hint3, (
        f"[{scenario['label']}] Hint 3 should introduce a toponym not in hint 1, but "
        f"all found toponyms {found_in_hint3} already appear in hint 1: {hint_texts[0]!r}"
    )


# ── Eval: score multipliers decrease with each level ──────────────────────────

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "scenario",
    EVAL_SCENARIOS,
    ids=[s["id"] for s in EVAL_SCENARIOS],
)
async def test_score_multipliers_decrease_across_levels(monkeypatch, scenario):
    """Each successive hint should reduce the max achievable score."""
    _patch_hint_agent(monkeypatch, scenario["claude_response"])

    view = PanoramaView(lat=0.0, lng=0.0, pano_id=f"pano-{scenario['id']}")
    multipliers = []
    for level in range(3):
        result = await progressive_hint(scenario["lat"], scenario["lng"], level, view)
        multipliers.append(result["max_score_multiplier"])

    assert multipliers[0] > multipliers[1] > multipliers[2], (
        f"[{scenario['label']}] Multipliers should strictly decrease: {multipliers}"
    )
    # Also verify they match the expected constants
    assert multipliers == [HINT_MULTIPLIERS[1], HINT_MULTIPLIERS[2], HINT_MULTIPLIERS[3]]


# ── Eval: prompt privacy — no coordinates or metadata in the prompt ───────────

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "scenario",
    EVAL_SCENARIOS,
    ids=[s["id"] for s in EVAL_SCENARIOS],
)
async def test_prompt_does_not_contain_real_coordinates(monkeypatch, scenario):
    """The system and user prompts sent to Claude must never contain the real
    coordinates or pano metadata, to prevent the LLM from 'cheating'."""
    captured: dict[str, object] = {}
    _patch_hint_agent(monkeypatch, scenario["claude_response"], captured)

    view = PanoramaView(lat=0.0, lng=0.0, pano_id=f"pano-{scenario['id']}")
    await progressive_hint(scenario["lat"], scenario["lng"], 0, view)

    request = captured["anthropic_request"]
    # Collect ALL text from system prompt + every text block in every message
    text_parts = [str(request.get("system", ""))]
    for msg in request.get("messages", []):
        msg_content = msg.get("content", [])
        if isinstance(msg_content, str):
            text_parts.append(msg_content)
        elif isinstance(msg_content, list):
            for block in msg_content:
                if isinstance(block, dict) and block.get("type") == "text":
                    text_parts.append(block["text"])
    combined_prompt = " ".join(text_parts)

    for hidden_value in (str(scenario["lat"]), str(scenario["lng"]), f"pano-{scenario['id']}"):
        assert hidden_value not in combined_prompt, (
            f"[{scenario['label']}] Hidden value '{hidden_value}' leaked into the prompt."
        )


# ── Eval: image is always sent when available ─────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "scenario",
    EVAL_SCENARIOS,
    ids=[s["id"] for s in EVAL_SCENARIOS],
)
async def test_image_is_included_in_prompt(monkeypatch, scenario):
    """When a Street View image is available, the prompt must include it
    so the hint agent can reason from actual visual evidence."""
    captured: dict[str, object] = {}
    _patch_hint_agent(monkeypatch, scenario["claude_response"], captured)

    view = PanoramaView(lat=0.0, lng=0.0, pano_id=f"pano-{scenario['id']}")
    await progressive_hint(scenario["lat"], scenario["lng"], 0, view)

    request = captured["anthropic_request"]
    content = request["messages"][0]["content"]
    image_blocks = [block for block in content if block.get("type") == "image"]
    assert len(image_blocks) == 1, (
        f"[{scenario['label']}] Expected exactly one image block in the prompt, "
        f"got {len(image_blocks)}."
    )


# ── Eval: _parse_hints robustness ─────────────────────────────────────────────

class TestParseHintsRobustness:
    """Verify the JSON parser handles edge cases from LLM output."""

    def test_valid_three_element_array(self):
        text = '["hint one", "hint two", "hint three"]'
        assert _parse_hints(text) == ["hint one", "hint two", "hint three"]

    def test_json_embedded_in_prose(self):
        text = 'Here are hints:\n["a", "b", "c"]\nHope that helps!'
        assert _parse_hints(text) == ["a", "b", "c"]

    def test_rejects_fewer_than_three_hints(self):
        with pytest.raises(ValueError):
            _parse_hints('["only one", "only two"]')

    def test_rejects_no_json(self):
        with pytest.raises(ValueError):
            _parse_hints("No JSON here at all.")

    def test_rejects_empty_strings_in_array(self):
        with pytest.raises(ValueError):
            _parse_hints('["valid", "", "also valid"]')

    def test_extra_hints_are_truncated(self):
        text = '["a", "b", "c", "d", "e"]'
        result = _parse_hints(text)
        assert len(result) == 3

    def test_numeric_elements_are_stringified(self):
        text = '["hint", 42, "another"]'
        result = _parse_hints(text)
        assert result == ["hint", "42", "another"]


# ── Eval: fallback hints quality (no API key) ─────────────────────────────────

@pytest.mark.asyncio
async def test_fallback_hints_are_useful_without_api_key(monkeypatch):
    """When no Anthropic key is configured, fallback hints should still
    provide actionable GeoGuessr-style advice."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")

    hints = []
    for level in range(3):
        result = await progressive_hint(44.4268, 26.1025, level)
        hints.append(result["hint"])

    # Fallback hints should mention real visual categories a player can use
    combined = " ".join(hints).lower()
    useful_terms = ["sign", "road", "architecture", "vegetation", "clue", "text"]
    matches = [term for term in useful_terms if term in combined]
    assert len(matches) >= 3, (
        f"Fallback hints should mention at least 3 useful visual categories. "
        f"Found: {matches}. Hints: {hints}"
    )

    # Every fallback hint should be a non-trivial sentence
    for i, hint in enumerate(hints):
        assert len(hint) >= 40, (
            f"Fallback hint {i + 1} is too short ({len(hint)} chars): {hint!r}"
        )
