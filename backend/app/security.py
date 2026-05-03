from __future__ import annotations

from functools import lru_cache
from typing import Any

import httpx
import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import PyJWKClient
from sqlalchemy.orm import Session

from app.database import get_db, get_settings
from app.models.user import UserProfile


@lru_cache
def jwks_client() -> PyJWKClient | None:
    settings = get_settings()
    if not settings.supabase_url:
        return None
    return PyJWKClient(f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json")


async def decode_supabase_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.supabase_url:
        return {"sub": "local-user", "email": "local@example.com", "user_metadata": {"name": "Local Player"}}
    try:
        client = jwks_client()
        if client is None:
            raise ValueError("JWKS client not configured")
        signing_key = client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            audience="authenticated",
            options={"verify_exp": True},
        )
    except Exception:
        async with httpx.AsyncClient(timeout=8) as http:
            response = await http.get(
                f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
                headers={"apikey": settings.supabase_anon_key, "Authorization": f"Bearer {token}"},
            )
        if response.status_code != 200:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Supabase token")
        user = response.json()
        return {
            "sub": user["id"],
            "email": user.get("email"),
            "user_metadata": user.get("user_metadata") or {},
        }


async def get_current_user_payload(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    return await decode_supabase_token(authorization.split(" ", 1)[1])


def ensure_user_profile(db: Session, payload: dict[str, Any]) -> UserProfile:
    user_id = str(payload.get("sub"))
    email = str(payload.get("email") or f"{user_id}@unknown.local")
    metadata = payload.get("user_metadata") or {}
    profile = db.get(UserProfile, user_id)
    if profile:
        if profile.email != email:
            profile.email = email
        return profile
    profile = UserProfile(
        id=user_id,
        email=email,
        display_name=metadata.get("name") or metadata.get("full_name") or email.split("@")[0],
        avatar_url=metadata.get("avatar_url"),
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


async def get_current_user(
    payload: dict[str, Any] = Depends(get_current_user_payload),
    db: Session = Depends(get_db),
) -> UserProfile:
    return ensure_user_profile(db, payload)

