# Deployment

The project is configured for a Render deployment:

- Frontend: Render Static Site, from the `frontend/` directory.
- Backend API: Render, from the `backend/` directory.
- Database: Supabase PostgreSQL.

Production URLs:

- Frontend: `https://aimhere-web.onrender.com`
- Backend API: `https://aimhere-api.onrender.com`
- SPA rewrite: `/*` is rewritten to `/index.html` so React routes work on refresh.

## Current CI/CD Flow

GitHub Actions runs on pull requests and pushes to `main`.

CI jobs:

- `backend`: installs Python dependencies and runs `pytest`.
- `frontend`: installs Node dependencies and runs `npm run build`.

CD jobs:

- `deploy-backend`: triggers a Render backend deploy after both CI jobs pass on `main`.
- `deploy-frontend`: triggers a Render frontend deploy after both CI jobs pass on `main`.

The deploy jobs use these GitHub Actions secrets:

```text
RENDER_BACKEND_DEPLOY_HOOK_URL
RENDER_FRONTEND_DEPLOY_HOOK_URL
```

Both secrets are configured in the GitHub repository. Render auto-deploy is disabled for both services, so production deployment is controlled by GitHub Actions: push to `main`, run CI, then trigger the Render deploy hooks only after CI succeeds.

## Backend On Render

Create a Render Web Service from this repository.

Recommended settings:

- Runtime: Python
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`

The repository also includes `render.yaml`, so Render can create the service as Blueprint infrastructure.

Required Render environment variables:

```text
SUPABASE_DB_URL=...
AUTH_SECRET_KEY=...
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
GOOGLE_MAPS_API_KEY=...
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://aimhere-web.onrender.com
```

After creating the service, copy its Deploy Hook URL and add it to GitHub Actions secrets:

```text
RENDER_BACKEND_DEPLOY_HOOK_URL=...
```

## Frontend On Render

Create a Render Static Site from this repository.

Recommended settings:

- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Output directory: `dist`

Required Render frontend environment variables:

```text
NODE_VERSION=22.12.0
VITE_API_URL=https://aimhere-api.onrender.com
VITE_GOOGLE_MAPS_API_KEY=...
```

After creating the static site, copy its Deploy Hook URL and add it to GitHub Actions secrets:

```text
RENDER_FRONTEND_DEPLOY_HOOK_URL=...
```

Because the frontend is a React single-page application, configure this static-site rewrite in Render under Redirects/Rewrites:

```text
Source: /*
Destination: /index.html
Action: Rewrite
```

## Verification

After the deploy is configured:

1. Push to `main`.
2. Wait for GitHub Actions to finish.
3. Open `https://aimhere-web.onrender.com`.
4. Register or log in.
5. Start a game and request a hint.
6. Check `https://aimhere-api.onrender.com/health`.

At that point the project has full CI/CD: CI through automated tests/builds, and CD through automatic Render deployment from `main`.
