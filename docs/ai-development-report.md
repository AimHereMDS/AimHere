# AIm Here AI Development Report

## AI Tools Used

- Codex was used as the implementation agent for code generation, test updates, debugging, and Jira-oriented backlog cleanup.
- Anthropic Claude is used by the application at runtime for the Curator Agent, Hint Agent, and Opponent Agent when `ANTHROPIC_API_KEY` is configured.
- Google Street View APIs are used as grounding tools: metadata checks validate playable coordinates, and Static Street View images provide visual context for hints and PvE guesses when `GOOGLE_MAPS_API_KEY` is configured.
- Jira/Atlassian Rovo was used to inspect project work items and mark implemented stories as completed.

## Prompts That Worked

Curator Agent prompt pattern:

```text
Return only a strict JSON array of public outdoor GPS coordinates likely to have Google Street View coverage.
Make the locations diverse, playable, and relevant to the requested filter.
Each item must include lat, lng, and label.
```

Hint Agent prompt pattern:

```text
Use only visual evidence visible in the current Street View frame.
Return exactly three hints ordered by usefulness.
Do not reveal coordinates, pano metadata, or a fixed continent/country/region template.
Use clues such as signs, language, domains, road markings, architecture, vegetation, and license plates.
```

Opponent Agent prompt pattern:

```text
You see the same Street View frame as the player and must place a map guess from visible evidence only.
Difficulty controls how broad or precise the estimate should be.
Return only JSON with lat, lng, and explanation.
The explanation must cite visible clues and uncertainty, not metadata or hidden coordinates.
```

## Generated Code Areas

- Backend FastAPI routers for games, location curation, hint generation, opponent guesses, auth, and leaderboard.
- SQLAlchemy models for users, games, rounds, and scores.
- Frontend React pages for setup, gameplay, results, profile, and leaderboard.
- Typed frontend agent clients that call backend endpoints instead of holding provider API keys in the browser.
- Evaluation tests for curator region matching, progressive hints, visual prompt privacy, opponent difficulty behavior, and fixed-set opponent score trends.
- CI workflow that runs backend tests and frontend build verification.

## Important Design Decisions

- Provider API keys stay on the backend. Frontend agent files are typed clients only.
- Runtime random/default locations are generated on demand; there is no stored location catalog.
- The app does not use Supabase Auth. Email/password auth is handled locally by the FastAPI backend with hashed passwords and backend-issued tokens.
- Visual hinting and visual opponent guesses degrade to deterministic fallbacks when API keys or Street View images are unavailable, keeping tests and local development stable.
- The opponent prompt never receives the real coordinates or panorama metadata; only the rendered image context is sent when available.
