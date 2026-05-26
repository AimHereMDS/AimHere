from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models.game import Game
from app.models.round import Round
from app.security import (
    authenticate_user,
    create_access_token,
    create_user_profile,
    decode_access_token,
    hash_password,
    verify_password,
)

TEST_DB_URL = "sqlite:///./test_auth.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


# --- password hashing ---

def test_hash_and_verify_password():
    hashed = hash_password("secret123")
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong", hashed)


def test_verify_password_none_stored():
    assert not verify_password("anything", None)


def test_verify_password_malformed_hash():
    assert not verify_password("anything", "not-a-valid-hash")


# --- JWT ---

def test_create_and_decode_token(db):
    user = create_user_profile(db, "tok@example.com", "pass1234")
    token = create_access_token(user)
    payload = decode_access_token(token)
    assert payload["sub"] == user.id
    assert payload["email"] == "tok@example.com"


# --- create_user_profile ---

def test_create_user_profile_success(db):
    user = create_user_profile(db, "new@example.com", "pass1234")
    assert user.email == "new@example.com"
    assert user.password_hash is not None


def test_create_user_profile_normalizes_email(db):
    user = create_user_profile(db, "  Upper@EXAMPLE.COM  ", "pass1234")
    assert user.email == "upper@example.com"


def test_create_user_profile_duplicate_raises(db):
    from fastapi import HTTPException
    create_user_profile(db, "dup@example.com", "pass1234")
    with pytest.raises(HTTPException) as exc:
        create_user_profile(db, "dup@example.com", "other1234")
    assert exc.value.status_code == 409


# --- authenticate_user ---

def test_authenticate_user_success(db):
    create_user_profile(db, "auth@example.com", "correct1")
    user = authenticate_user(db, "auth@example.com", "correct1")
    assert user.email == "auth@example.com"


def test_authenticate_user_wrong_password(db):
    from fastapi import HTTPException
    create_user_profile(db, "auth2@example.com", "correct1")
    with pytest.raises(HTTPException) as exc:
        authenticate_user(db, "auth2@example.com", "wrong")
    assert exc.value.status_code == 401


def test_authenticate_user_unknown_email(db):
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        authenticate_user(db, "ghost@example.com", "anything")
    assert exc.value.status_code == 401


# --- HTTP endpoints ---

def test_register_endpoint(client):
    response = client.post("/auth/register", json={"email": "e2e@example.com", "password": "pass1234"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "e2e@example.com"


def test_register_duplicate_email(client):
    payload = {"email": "dup2@example.com", "password": "pass1234"}
    client.post("/auth/register", json=payload)
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 409


def test_login_endpoint(client):
    client.post("/auth/register", json={"email": "login@example.com", "password": "pass1234"})
    response = client.post("/auth/login", json={"email": "login@example.com", "password": "pass1234"})
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_wrong_password(client):
    client.post("/auth/register", json={"email": "bad@example.com", "password": "pass1234"})
    response = client.post("/auth/login", json={"email": "bad@example.com", "password": "wrongpassword"})
    assert response.status_code == 401


def test_me_endpoint(client):
    reg = client.post("/auth/register", json={"email": "me@example.com", "password": "pass1234"})
    token = reg.json()["access_token"]
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "me@example.com"


def test_me_endpoint_no_token(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_me_endpoint_invalid_token(client):
    response = client.get("/auth/me", headers={"Authorization": "Bearer garbage"})
    assert response.status_code == 401


def test_me_endpoint_includes_real_career_and_coverage_stats(client, db):
    user = create_user_profile(db, "stats@example.com", "pass1234")
    game = Game(
        user_id=user.id,
        mode="pve",
        rounds_played=2,
        total_score=8600,
        ai_total_score=7000,
        rounds_won=2,
        ai_rounds_won=0,
        completed_at=datetime.now(UTC),
    )
    db.add(game)
    db.flush()
    db.add_all(
        [
            Round(
                game_id=game.id,
                round_index=1,
                real_lat=44.4268,
                real_lng=26.1025,
                guess_lat=44.42,
                guess_lng=26.1,
                distance_km=0.7,
                score=4998,
                hint_count=0,
            ),
            Round(
                game_id=game.id,
                round_index=2,
                real_lat=48.8566,
                real_lng=2.3522,
                guess_lat=48.85,
                guess_lng=2.35,
                distance_km=8.5,
                score=3602,
                hint_count=1,
            ),
        ]
    )
    user.games_played = 1
    user.total_score = 8600
    user.best_score = 8600
    user.average_score = 8600
    user.current_streak = 0
    user.best_streak = 0
    db.commit()

    token = create_access_token(user)
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    data = response.json()
    assert data["career_stats"]["rounds_played"] == 2
    assert data["career_stats"]["closest_guess_km"] == 0.7
    assert data["career_stats"]["sub_1km_guesses"] == 1
    assert data["career_stats"]["pve_wins"] == 1
    assert data["world_coverage"]["routes"] == 2
    assert data["world_coverage"]["points"][0]["score"] in {4998, 3602}
    achievements = {achievement["id"]: achievement for achievement in data["achievements"]}
    assert achievements["first-fix"]["earned"] is True
    assert achievements["pinpoint"]["earned"] is True
