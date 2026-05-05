# AIm Here

AIm Here is an AI-powered GeoGuessr-like web game. Players explore live Google Street View panoramas, place guesses on a world map, use progressive AI hints, and optionally compete against an AI opponent.

## Features

- Local email/password auth backed by the application database.
- Protected game, results, and profile routes.
- User profile stats: games played, total score, average score, best score, and streaks.
- Global leaderboard from Supabase PostgreSQL.
- Default mode generates random Street View-covered coordinates at runtime.
- Custom filters use the Curator Agent, then snap candidates toward playable Street View panoramas when Google Maps metadata is available.
- Interactive `StreetViewPanorama`, not static images.
- Rotation-only, limited-movement, and full-movement modes.
- Five-round single-player gameplay.
- Saved unfinished matches can be resumed from the home or setup screen.
- PvE mode with easy, medium, and hard AI opponent guesses from the current Street View frame.
- PvE results include rounds won and average distance difference versus the AI.
- Progressive visual Hint Agent with score penalties.
- Round and final results include the hint log and AI reasoning shown to the player.
- End-game summary map with real locations, guesses, and connecting lines.

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, Google Maps JavaScript API.
- Backend: FastAPI, SQLAlchemy, PostgreSQL on Supabase, Anthropic API, Google Street View metadata API.
- CI: GitHub Actions.
- Containers: Docker Compose with frontend and backend services only.

## Setup

1. Create a Supabase project for PostgreSQL hosting.
2. Enable a Google Maps JavaScript API key with Maps JavaScript API, Street View Static API, and Street View metadata access.
3. Create an Anthropic API key.
4. Copy `.env.example` to `.env` and fill in values.

The backend uses `ANTHROPIC_MODEL=claude-sonnet-4-20250514` by default. Override it in `.env` if your Anthropic account requires a different available model.

Visual hints and visual opponent guesses require both `ANTHROPIC_API_KEY` and `GOOGLE_MAPS_API_KEY`. Without the Google Maps key, the app still runs, but the Hint Agent falls back to generic player-style advice and the Opponent Agent falls back to deterministic difficulty-based placement instead of scene-specific visual reasoning.

Backend:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Docker:
```bash
docker compose up --build
```

## Supabase Database

Set `SUPABASE_DB_URL` to your Supabase PostgreSQL connection string. Authentication is handled by this FastAPI app with hashed passwords stored in the `users` table. The backend creates the minimal tables on startup:

- `users`
- `games`
- `rounds`
- `scores`

There is no stored location catalog.

## Backlog Epics

- [Authentication](#features)
- [Runtime Location System](#features)
- [Street View Movement Rules](#features)
- [Single Player Gameplay](#features)
- [PvE Opponent](#features)
- [AI Agents](./AGENTS.md)
- [AI Development Report](./docs/ai-development-report.md)
- [CI and Deployment](./.github/workflows/ci.yml)

## Tests

```bash
cd backend
pytest
```

```bash
cd frontend
npm run build
```
