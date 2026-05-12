from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.database import Base, engine, get_settings
from app.models import game, round, score, user  # noqa: F401
from app.routers import auth, game as game_router, leaderboard, locations

settings = get_settings()


def initialize_database() -> None:
    if settings.auth_secret_key == "change-me-local-dev-secret" and not settings.supabase_db_url.startswith("sqlite"):
        raise RuntimeError("AUTH_SECRET_KEY must be set to a strong random value in non-SQLite environments")
    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "password_hash" not in user_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    initialize_database()
    yield


app = FastAPI(title="AIm Here API", version="1.0.0", lifespan=lifespan)
origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(game_router.router)
app.include_router(locations.router)
app.include_router(leaderboard.router)
