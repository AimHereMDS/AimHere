from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import UserProfile
from app.schemas import UserProfileOut
from app.security import authenticate_user, create_access_token, create_user_profile, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class AuthCredentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileOut


@router.post("/register", response_model=AuthResponse)
async def register(credentials: AuthCredentials, db: Session = Depends(get_db)) -> AuthResponse:
    user = create_user_profile(db, credentials.email, credentials.password)
    return AuthResponse(access_token=create_access_token(user), user=UserProfileOut.model_validate(user))


@router.post("/login", response_model=AuthResponse)
async def login(credentials: AuthCredentials, db: Session = Depends(get_db)) -> AuthResponse:
    user = authenticate_user(db, credentials.email, credentials.password)
    return AuthResponse(access_token=create_access_token(user), user=UserProfileOut.model_validate(user))


@router.get("/me", response_model=UserProfileOut)
async def me(user: UserProfile = Depends(get_current_user)) -> UserProfile:
    return user
