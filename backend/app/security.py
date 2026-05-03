from __future__ import annotations

from datetime import datetime, timedelta, timezone
import base64
import hashlib
import hmac
import os
from typing import Any
from uuid import uuid4

import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db, get_settings
from app.models.user import UserProfile

HASH_ITERATIONS = 210_000
TOKEN_ALGORITHM = "HS256"
TOKEN_TTL_HOURS = 24 * 14


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, HASH_ITERATIONS)
    return (
        f"pbkdf2_sha256${HASH_ITERATIONS}$"
        f"{base64.b64encode(salt).decode()}$"
        f"{base64.b64encode(digest).decode()}"
    )


def verify_password(password: str, stored_hash: str | None) -> bool:
    if not stored_hash:
        return False
    try:
        algorithm, iterations, salt_b64, digest_b64 = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def create_access_token(user: UserProfile) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user.id,
        "email": user.email,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=TOKEN_TTL_HOURS)).timestamp()),
    }
    return jwt.encode(payload, settings.auth_secret_key, algorithm=TOKEN_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.auth_secret_key, algorithms=[TOKEN_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


def create_user_profile(db: Session, email: str, password: str) -> UserProfile:
    normalized_email = email.strip().lower()
    existing = db.query(UserProfile).filter(UserProfile.email == normalized_email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
    profile = UserProfile(
        id=str(uuid4()),
        email=normalized_email,
        password_hash=hash_password(password),
        display_name=normalized_email.split("@")[0],
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def authenticate_user(db: Session, email: str, password: str) -> UserProfile:
    normalized_email = email.strip().lower()
    profile = db.query(UserProfile).filter(UserProfile.email == normalized_email).first()
    if not profile or not verify_password(password, profile.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return profile


async def get_current_user_payload(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    return decode_access_token(authorization.split(" ", 1)[1])


async def get_current_user(
    payload: dict[str, Any] = Depends(get_current_user_payload),
    db: Session = Depends(get_db),
) -> UserProfile:
    user_id = str(payload.get("sub") or "")
    profile = db.get(UserProfile, user_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists")
    return profile
