# AIm Here

AIm Here is an AI-powered GeoGuessr-like web game. Players explore live Google Street View panoramas, place guesses on a world map, use progressive AI hints, and optionally compete against an AI opponent.

## Features

- Supabase email/password auth and Google OAuth.
- Protected game, results, and profile routes.
- User profile stats: games played, total score, average score, best score, and streaks.
- Global leaderboard from Supabase PostgreSQL.
- Default mode generates random Street View-covered coordinates at runtime.
- Custom and predefined filters use the Curator Agent.
- Interactive `StreetViewPanorama`, not static images.
- Rotation-only, limited-movement, and full-movement modes.
- Five-round single-player gameplay.
- PvE mode with easy, medium, and hard AI opponent guesses.
- Progressive Hint Agent with score penalties.
- End-game summary map with real locations, guesses, and connecting lines.

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, Supabase JS, Google Maps JavaScript API.
- Backend: FastAPI, SQLAlchemy, PostgreSQL on Supabase, Anthropic API, Google Street View metadata API.
- CI: GitHub Actions.
- Containers: Docker Compose with frontend and backend services only.

## Setup

1. Create a Supabase project and configure email/password plus Google OAuth.
2. Enable a Google Maps JavaScript API key with Maps JavaScript API and Street View metadata access.
3. Create an Anthropic API key.
4. Copy `.env.example` to `.env` and fill in values.

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

Set `SUPABASE_DB_URL` to your Supabase PostgreSQL connection string. The backend creates the minimal tables on startup:

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
