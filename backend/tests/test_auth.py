import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
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
