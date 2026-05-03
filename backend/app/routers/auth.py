from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from app.database import get_settings
from app.models.user import UserProfile
from app.schemas import UserProfileOut
from app.security import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class AuthCredentials(BaseModel):
    email: EmailStr
    password: str


async def _supabase_auth(path: str, body: dict[str, str]) -> dict:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=500, detail="Supabase auth environment is not configured")
    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.post(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/{path}",
            headers={"apikey": settings.supabase_anon_key, "Content-Type": "application/json"},
            json=body,
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.json())
    return response.json()


@router.post("/register")
async def register(credentials: AuthCredentials) -> dict:
    return await _supabase_auth("signup", credentials.model_dump())


@router.post("/login")
async def login(credentials: AuthCredentials) -> dict:
    return await _supabase_auth("token?grant_type=password", credentials.model_dump())


@router.get("/me", response_model=UserProfileOut)
async def me(user: UserProfile = Depends(get_current_user)) -> UserProfile:
    return user

