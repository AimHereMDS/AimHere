from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import UserProfile
from app.schemas import LeaderboardEntry

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("", response_model=list[LeaderboardEntry])
async def leaderboard(db: Session = Depends(get_db)) -> list[LeaderboardEntry]:
    rows = (
        db.query(UserProfile)
        .filter(UserProfile.games_played > 0)
        .order_by(desc(UserProfile.best_score), desc(UserProfile.average_score))
        .limit(100)
        .all()
    )
    return [
        LeaderboardEntry(
            rank=index + 1,
            user_id=row.id,
            display_name=row.display_name,
            total_score=row.total_score,
            best_score=row.best_score,
            games_played=row.games_played,
            average_score=row.average_score,
            updated_at=None,
        )
        for index, row in enumerate(rows)
    ]

