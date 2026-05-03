# Claude Code Guide

## Project Structure

- `frontend/`: React + Vite + TypeScript + Tailwind CSS.
- `backend/`: FastAPI, SQLAlchemy, Supabase PostgreSQL, AI agents.
- `.github/workflows/ci.yml`: backend tests and frontend build.
- `docker-compose.yml`: frontend and backend only. Supabase hosts Postgres.

## Local Setup

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

The app runs at `http://localhost:5173`; the API runs at `http://localhost:8000`.

## Environment Variables

Copy `.env.example` to `.env` at the repo root for Docker, and expose the same values to backend/frontend local shells as needed.

Required backend keys:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `ANTHROPIC_API_KEY`
- `GOOGLE_MAPS_API_KEY`
- `CORS_ORIGINS`

Required frontend keys:
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_MAPS_API_KEY`

## Adding New Agents

1. Add backend implementation in `backend/app/agents/<name>_agent.py`.
2. Keep provider API calls on the backend only.
3. Add a typed frontend client in `frontend/src/agents/<name>Agent.ts`.
4. Add router endpoints if the UI needs direct access.
5. Add tests in `backend/tests/`.
6. Document inputs, outputs, prompts, and limitations in `AGENTS.md`.

## Code Style

- Use typed Pydantic schemas for API boundaries.
- Keep database writes in routers or service functions, not frontend code.
- Never hardcode API keys.
- Do not add a locations table; generate or curate locations at runtime.
- Tailwind classes should produce complete, styled UI states.

## Tests

```bash
cd backend
pytest
```

```bash
cd frontend
npm run build
```

