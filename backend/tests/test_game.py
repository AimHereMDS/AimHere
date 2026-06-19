from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models.game import Game
from app.models.round import Round
from app.security import create_access_token, create_user_profile


def make_client(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'test_game.db'}",
        connect_args={"check_same_thread": False},
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSession()
    app.dependency_overrides[get_db] = lambda: db
    return TestClient(app), db, engine


def close_client(db, engine):
    db.close()
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def auth_headers(db, email="game@example.com"):
    user = create_user_profile(db, email, "pass1234")
    return user, {"Authorization": f"Bearer {create_access_token(user)}"}


def test_prefetch_opponent_guess_endpoint_uses_current_view(monkeypatch, tmp_path):
    client, db, engine = make_client(tmp_path)
    try:
        user, headers = auth_headers(db)
        game = Game(user_id=user.id, mode="pve", ai_difficulty="surveyor")
        db.add(game)
        db.commit()
        db.refresh(game)

        captured = {}

        async def fake_opponent_guess(lat, lng, difficulty, view):
            captured["lat"] = lat
            captured["lng"] = lng
            captured["difficulty"] = difficulty
            captured["view"] = view
            return {
                "lat": 45.0,
                "lng": 25.0,
                "difficulty": difficulty,
                "explanation": "Romanian road furniture is visible.",
            }

        monkeypatch.setattr("app.routers.game.opponent_guess", fake_opponent_guess)

        response = client.post(
            f"/games/{game.id}/opponent-guess",
            headers=headers,
            json={
                "round_index": 1,
                "real": {"lat": 48.8584, "lng": 2.2945},
                "ai_difficulty": "surveyor",
                "view": {
                    "lat": 48.8585,
                    "lng": 2.2946,
                    "pano_id": "pano-123",
                    "heading": 210.5,
                    "pitch": -4,
                    "fov": 72,
                },
            },
        )

        assert response.status_code == 200
        assert response.json()["difficulty"] == "surveyor"
        assert captured["lat"] == 48.8584
        assert captured["lng"] == 2.2945
        assert captured["difficulty"] == "surveyor"
        assert captured["view"].pano_id == "pano-123"
        assert captured["view"].heading == 210.5
    finally:
        close_client(db, engine)


def test_submit_round_uses_prefetched_opponent_guess(monkeypatch, tmp_path):
    client, db, engine = make_client(tmp_path)
    try:
        user, headers = auth_headers(db, "submit@example.com")
        game = Game(user_id=user.id, mode="pve", ai_difficulty="navigator")
        db.add(game)
        db.commit()
        db.refresh(game)

        async def fail_opponent_guess(*args, **kwargs):
            raise AssertionError("submit_round should reuse prefetched_ai_guess")

        monkeypatch.setattr("app.routers.game.opponent_guess", fail_opponent_guess)

        response = client.post(
            f"/games/{game.id}/rounds",
            headers=headers,
            json={
                "round_index": 1,
                "real": {"lat": 48.8584, "lng": 2.2945},
                "guess": {"lat": 48.86, "lng": 2.29},
                "hint_count": 0,
                "ai_difficulty": "navigator",
                "prefetched_ai_guess": {
                    "lat": 45.0,
                    "lng": 25.0,
                    "difficulty": "navigator",
                    "explanation": "Prefetched visual estimate.",
                },
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["ai_guess"]["lat"] == 45.0
        assert data["ai_guess"]["lng"] == 25.0
        assert data["ai_guess"]["explanation"] == "Prefetched visual estimate."
        assert data["ai_score"] is not None

        round_row = db.query(Round).one()
        assert round_row.ai_guess_lat == 45.0
        assert round_row.ai_guess_lng == 25.0
        assert round_row.ai_explanation == "Prefetched visual estimate."
    finally:
        close_client(db, engine)
