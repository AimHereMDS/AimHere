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

Purpose: returns progressive hints for the current panorama. Level 1 gives continent, level 2 gives country, and level 3 gives region or city. Each hint reduces the max round score.

Input:
```json
{ "lat": 44.4268, "lng": 26.1025, "used_levels": 1 }
```

Output:
```json
{
  "level": 2,
  "title": "Country clue",
  "hint": "The country is likely Romania.",
  "max_score_multiplier": 0.7
}
```

Prompt pattern: ask Claude to infer likely visual clues from road signs, language, architecture, vegetation, road markings, and license plates, returning exactly three progressive strings.

Known limitations: the current backend receives panorama coordinates, not raw imagery. Visual clue language is inferred from location context.

## Opponent Agent

Files:
- `backend/app/agents/opponent_agent.py`
- `frontend/src/agents/opponentAgent.ts`

Purpose: powers PvE. The AI guesses after the player submits a pin, with easy, medium, and hard difficulty affecting average error radius.

Input:
```json
{ "lat": 48.8584, "lng": 2.2945, "difficulty": "medium" }
```

Output:
```json
{
  "lat": 48.1,
  "lng": 5.7,
  "difficulty": "medium",
  "explanation": "Medium AI balanced regional clues with uncertainty..."
}
```

Prompt pattern: ask Claude for concise GeoGuessr-style reasoning while deterministic geodesic noise enforces difficulty ranges.

Known limitations: the explanation is AI-generated from coordinates and may mention plausible clues rather than verified OCR.

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

