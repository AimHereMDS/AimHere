# AIm Here AI Development Report

## Context

AIm Here was developed as an AI-assisted software project: the team used AI both as a development tool and as part of the application functionality. At the beginning of the project, Claude was used to choose and refine the application idea so that it would satisfy the project requirements, including the requirement for AI agents, testing, source control, backlog, and demo deliverables. Claude was also used to break the idea into initial development tasks.

After that planning step, the team copied the task-generation prompt produced by Claude and used it in the Claude browser extension in Chrome, so Claude could add the initial work items directly to Jira. The application itself contains runtime AI agents for location curation, visual hints, and PvE opponent guesses, while external AI tools were used during implementation, debugging, test generation, backlog management, and review cleanup.

The goal of using AI during development was not to replace the normal software process, but to speed up implementation while keeping the final code reviewable, testable, and under source control. Generated or suggested code was still checked locally through tests, frontend builds, Git diffs, and pull requests.

## AI Tools Used

- Claude was used at the start of the project to define the application idea, check it against the grading requirements, and generate the initial task/backlog structure.
- The Claude browser extension in Chrome was used to take the generated Jira-task prompt and add the initial tasks directly into the Jira board.
- Codex and Claude Code were used as implementation assistants for code generation, refactoring, test updates, debugging, and repo operations.
- Claude Code was useful for local coding sessions where the task was mostly implementation-focused, such as generating first versions of features, adjusting existing files, and checking errors against the surrounding code.
- Codex was used for later repo-level work: inspecting the real checkout, running tests and builds, editing documentation, creating diagrams and demo artifacts, configuring deployment, working with GitHub, and verifying the live Render deployment.
- Anthropic Claude is used by the application at runtime for the Curator Agent, Hint Agent, and Opponent Agent when `ANTHROPIC_API_KEY` is configured.
- Google Street View APIs are used as grounding tools: metadata checks validate playable coordinates, and Static Street View images provide visual context for hints and PvE guesses when `GOOGLE_MAPS_API_KEY` is configured.
- Jira/Atlassian Rovo was used to inspect project work items, create missing tasks, and track implemented stories or bug fixes.
- GitHub pull requests and automated checks were used as the control layer around AI-assisted changes.

## How AI Was Used During Development

AI was used in several concrete development workflows:

- Generating initial backend and frontend scaffolding for a split FastAPI and React application.
- Choosing the project idea and validating that it could cover the required features, AI-agent requirement, backlog, tests, CI, and demo.
- Creating the first backlog/task breakdown from the selected idea.
- Adding the initial generated tasks to Jira through the Claude browser extension in Chrome.
- Implementing user-facing flows such as authentication, game setup, Street View gameplay, round results, profile stats, and leaderboard views.
- Designing and implementing the three application AI agents.
- Creating typed frontend clients that call backend endpoints instead of exposing provider keys in the browser.
- Debugging runtime issues such as blank pages, map layout problems, hint request hangs, black panorama fallbacks, and result panel overflow.
- Writing and extending automated tests, especially eval-style tests for AI-agent behavior.
- Turning feedback and observed UI defects into Jira issues.
- Addressing pull request review feedback and keeping changes traceable through branches and PRs.
- Preparing delivery artifacts such as implementation documentation, AI-agent documentation, Mermaid diagram sources, exported diagram images, and the offline demo video.
- Configuring CI/CD by connecting the repository to Render, adding GitHub Actions deploy jobs, storing Render deploy hooks as GitHub Actions secrets, and verifying the deployed frontend and backend.

AI suggestions were not accepted blindly. The project used local verification steps such as:

```bash
cd backend
pytest
```

```bash
cd frontend
npm run build
```

The GitHub Actions workflow also repeats these checks on pull requests and pushes to `main`.

## Prompts That Worked

The most useful development prompts were specific, file-aware, and included constraints. Instead of asking for generic features, prompts described the expected behavior, the current failure, and the files or modules involved.

Example development prompt patterns:

```text
Inspect the current backend agent implementation and make the hint agent reason from the visible Street View frame only. Do not reveal the real coordinates or pano metadata in the prompt.
```

```text
Fix the map feedback after submit so the player's guess, the real location, the distance line, and the round distance remain visible.
```

```text
Check the open Jira issues for the AH project, then implement only the current open items and mark them done after verification.
```

Curator Agent runtime prompt pattern:

```text
Return only a strict JSON array of public outdoor GPS coordinates likely to have Google Street View coverage.
Make the locations diverse, playable, and relevant to the requested filter.
Each item must include lat, lng, and label.
```

Hint Agent runtime prompt pattern:

```text
Use only visual evidence visible in the current Street View frame.
Return exactly three hints ordered by usefulness.
Do not reveal coordinates, pano metadata, or a fixed continent/country/region template.
Use clues such as signs, language, domains, road markings, architecture, vegetation, and license plates.
```

Opponent Agent runtime prompt pattern:

```text
You see the same Street View frame as the player and must place a map guess from visible evidence only.
Difficulty controls how broad or precise the estimate should be.
Return only JSON with lat, lng, and explanation.
The explanation must cite visible clues and uncertainty, not metadata or hidden coordinates.
```

## Code Areas Developed With AI Assistance

- Backend FastAPI routers for games, location curation, hint generation, opponent guesses, auth, and leaderboard.
- SQLAlchemy models for users, games, rounds, and scores.
- Frontend React pages for setup, gameplay, results, profile, and leaderboard.
- Google Maps and Street View integration components.
- Typed frontend agent clients that call backend endpoints instead of holding provider API keys in the browser.
- Evaluation tests for curator region matching, progressive hints, visual prompt privacy, opponent difficulty behavior, and fixed-set opponent score trends.
- CI workflow that runs backend tests and frontend build verification.
- CD workflow that triggers Render deployments from GitHub Actions after CI succeeds on `main`.
- Render deployment configuration and deployment documentation.
- Jira backlog cleanup and bug-tracking tasks.

## Runtime AI Agents

The project includes three AI agents as part of the application functionality:

- Curator Agent: generates playable location candidates for custom or predefined filters.
- Hint Agent: returns progressively more useful visual hints for the current Street View frame.
- Opponent Agent: powers PvE by making an AI guess from the same visible frame as the player.

The agents are implemented on the backend so that provider API keys remain private. Frontend files under `frontend/src/agents/` are typed clients, not real provider integrations.

## Important Design Decisions

- Provider API keys stay on the backend. Frontend agent files are typed clients only.
- Runtime random/default locations are generated on demand; there is no stored location catalog.
- The app does not use Supabase Auth. Email/password auth is handled locally by the FastAPI backend with hashed passwords and backend-issued tokens.
- Visual hinting and visual opponent guesses degrade to deterministic fallbacks when API keys or Street View images are unavailable, keeping tests and local development stable.
- The opponent prompt never receives the real coordinates or panorama metadata; only the rendered image context is sent when available.
- Evals check that visual agents use current-view image context and avoid leaking hidden coordinates.

## AI Limitations And Mitigations

AI-generated code can introduce incorrect assumptions, incomplete edge-case handling, or inconsistent UI behavior. The project reduced these risks through:

- Pull requests and commit history instead of direct untracked changes.
- Automated backend tests and frontend builds.
- Agent evals that assert output format, prompt privacy, and difficulty behavior.
- Deterministic fallbacks when external AI or Street View image calls are unavailable.
- Manual inspection of UI behavior for map and Street View issues.
- Keeping secrets in environment variables instead of generated frontend code.

The most important lesson was that AI was most useful when given precise constraints and then checked against real project behavior. For example, agent prompts had to be revised so hints and opponent guesses used only visual evidence, not hidden coordinates.

## CI/CD Status

The current GitHub Actions workflow is a CI/CD pipeline. It runs automatically on pull requests and pushes to `main`, installs backend and frontend dependencies, runs backend tests, verifies the frontend production build, and deploys to Render after the checks pass on `main`.

Current CI checks:

- Backend: `pip install -r requirements.txt` and `pytest`
- Frontend: `npm install` and `npm run build`

Current CD steps:

- Backend: GitHub Actions calls the Render deploy hook stored in `RENDER_BACKEND_DEPLOY_HOOK_URL`.
- Frontend: GitHub Actions calls the Render deploy hook stored in `RENDER_FRONTEND_DEPLOY_HOOK_URL`.
- Render builds the backend from `backend/` and starts it with `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- Render builds the frontend from `frontend/` with `npm install && npm run build` and serves the generated `dist/` directory.

Production deployment:

- Frontend: `https://aimhere-web.onrender.com`
- Backend API: `https://aimhere-api.onrender.com`

The deployment was verified by checking the backend health endpoint, loading the production frontend, validating CORS for the Render frontend origin, and running a registration smoke test against the deployed API.
