# AIm Here Agents

AIm Here uses three AI agents. Backend agents hold provider API keys and make real Anthropic calls when `ANTHROPIC_API_KEY` is configured. Frontend agent files are typed clients that call the backend endpoints.

## Curator Agent

Files:
- `backend/app/agents/curator_agent.py`
- `frontend/src/agents/curatorAgent.ts`

Purpose: generates five playable GPS coordinates for custom or predefined location filters. It is not called in default world-random mode.

Input:
```json
{ "mode": "custom", "filter_text": "big cities in Asia", "count": 5 }
```

Output:
```json
{
  "locations": [
    { "lat": 35.6762, "lng": 139.6503, "label": "Tokyo" }
  ]
}
```

Prompt pattern: ask Claude for a strict JSON array of public outdoor coordinates likely to have Google Street View coverage. The backend verifies coverage with the Google Street View metadata API when `GOOGLE_MAPS_API_KEY` is set.

Known limitations: Street View metadata is radius-based, so the returned playable panorama may snap slightly away from the exact coordinate.

## Hint Agent

Files:
- `backend/app/agents/hint_agent.py`
- `frontend/src/agents/hintAgent.ts`

Purpose: returns progressively better visual hints for the current panorama. The hints are not fixed categories. Hint 1 is useful but not too direct, hint 2 is more specific, and hint 3 is the strongest visible clue the agent can give without using hidden coordinates. Each hint reduces the max round score.

Input:
```json
{
  "lat": 44.4268,
  "lng": 26.1025,
  "used_levels": 1,
  "view": { "pano_id": "abc123", "heading": 210.5, "pitch": -4, "fov": 72 }
}
```

Output:
```json
{
  "level": 2,
  "title": "Hint 2",
  "hint": "A visible .ro web domain and Romanian-looking diacritics make Romania a strong guess.",
  "max_score_multiplier": 0.7
}
```

Prompt pattern: ask Claude to infer from the same visible Street View frame as the player, using clues like road signs, language, web domains, architecture, vegetation, road markings, and license plates. It must return exactly three strings ordered by usefulness, not by fixed categories like continent/country/region. When both `ANTHROPIC_API_KEY` and `GOOGLE_MAPS_API_KEY` are configured, the backend fetches a Google Street View Static image for the current panorama view and sends it to Claude as image context.

Known limitations: without a Google Maps key, or if the static image request fails, visual hinting falls back to generic player-style advice instead of scene-specific clues.

## Opponent Agent

Files:
- `backend/app/agents/opponent_agent.py`
- `frontend/src/agents/opponentAgent.ts`

Purpose: powers PvE. The AI guesses after the player submits a pin by looking at the same Street View frame, with easy, medium, and hard difficulty affecting how ambitious the visual estimate should be.

Input:
```json
{
  "lat": 48.8584,
  "lng": 2.2945,
  "difficulty": "medium",
  "view": { "pano_id": "abc123", "heading": 210.5, "pitch": -4, "fov": 72 }
}
```

Output:
```json
{
  "lat": 45.0,
  "lng": 25.0,
  "difficulty": "medium",
  "explanation": "A .ro sign and Romanian-looking road furniture suggest Romania, but the exact city is uncertain."
}
```

Prompt pattern: ask Claude to place a map guess from visible evidence only, using the current Street View Static frame. The prompt does not reveal the real coordinates or pano metadata. If no image is available, deterministic geodesic noise provides a fallback guess for the configured difficulty.

Known limitations: without image context, the opponent cannot make a true visual guess and falls back to deterministic difficulty-based placement with a generic explanation.

## Running Evals

```bash
cd backend
pip install -r requirements.txt
pytest
```

Eval coverage:
- `test_curator_agent.py`: checks requested geographic regions.
- `test_hint_agent.py`: checks progressive hint format and score multipliers.
- `test_opponent_agent.py`: checks difficulty distance ranges.
