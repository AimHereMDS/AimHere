from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.game import Game
from app.models.round import Round
from app.models.user import UserProfile
from app.schemas import AchievementOut, CareerStats, CoveragePoint, UserProfileOut, WorldCoverage
from app.security import authenticate_user, create_access_token, create_user_profile, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class AuthCredentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileOut


def _achievement(
    achievement_id: str,
    title: str,
    description: str,
    progress: float,
    goal: float,
    category: str,
) -> AchievementOut:
    bounded_progress = max(0.0, min(progress, goal))
    return AchievementOut(
        id=achievement_id,
        title=title,
        description=description,
        earned=progress >= goal,
        progress=bounded_progress,
        goal=goal,
        category=category,
    )


def build_profile_response(user: UserProfile, db: Session) -> UserProfileOut:
    completed_games = (
        db.query(Game)
        .filter(Game.user_id == user.id, Game.completed_at.is_not(None))
        .order_by(Game.completed_at.desc())
        .all()
    )
    completed_game_ids = [game.id for game in completed_games]
    rounds: list[Round] = []
    if completed_game_ids:
        rounds = (
            db.query(Round)
            .filter(Round.game_id.in_(completed_game_ids))
            .order_by(Round.created_at.desc())
            .all()
        )

    distances = [round_row.distance_km for round_row in rounds]
    scores = [round_row.score for round_row in rounds]
    hints_used = sum(round_row.hint_count for round_row in rounds)
    no_hint_games = 0
    pve_wins = 0
    pve_losses = 0
    pve_draws = 0

    rounds_by_game: dict[str, list[Round]] = {}
    for round_row in rounds:
        rounds_by_game.setdefault(round_row.game_id, []).append(round_row)

    for game in completed_games:
        game_rounds = rounds_by_game.get(game.id, [])
        if game_rounds and all(round_row.hint_count == 0 for round_row in game_rounds):
            no_hint_games += 1
        if game.mode == "pve":
            if game.total_score > game.ai_total_score:
                pve_wins += 1
            elif game.total_score < game.ai_total_score:
                pve_losses += 1
            else:
                pve_draws += 1

    career_stats = CareerStats(
        rounds_played=len(rounds),
        best_round_score=max(scores, default=0),
        average_round_score=(sum(scores) / len(scores)) if scores else 0.0,
        average_distance_km=(sum(distances) / len(distances)) if distances else None,
        closest_guess_km=min(distances) if distances else None,
        sub_1km_guesses=sum(1 for distance in distances if distance <= 1),
        sub_10km_guesses=sum(1 for distance in distances if distance <= 10),
        near_perfect_rounds=sum(1 for score in scores if score >= 4900),
        hints_used=hints_used,
        average_hints_per_game=(hints_used / len(completed_games)) if completed_games else 0.0,
        no_hint_games=no_hint_games,
        pve_wins=pve_wins,
        pve_losses=pve_losses,
        pve_draws=pve_draws,
    )
    coverage_points = [
        CoveragePoint(
            lat=round_row.real_lat,
            lng=round_row.real_lng,
            score=round_row.score,
            distance_km=round_row.distance_km,
            hint_count=round_row.hint_count,
            game_id=round_row.game_id,
            round_index=round_row.round_index,
            played_at=round_row.created_at,
        )
        for round_row in rounds
    ]
    latest_played_at = max((round_row.created_at for round_row in rounds), default=None)
    achievements = [
        _achievement("first-fix", "First Fix", "Finish your first match.", user.games_played, 1, "Milestone"),
        _achievement("pinpoint", "Pinpoint", "Place a guess within 1 km.", career_stats.sub_1km_guesses, 1, "Precision"),
        _achievement("cartographer", "Cartographer", "Score 20,000 points in one match.", user.best_score, 20000, "Score"),
        _achievement("road-reader", "Road Reader", "Make five guesses within 10 km.", career_stats.sub_10km_guesses, 5, "Precision"),
        _achievement("ai-slayer", "AI Slayer", "Beat the AI rival in PvE.", career_stats.pve_wins, 1, "PvE"),
        _achievement("streak-line", "Streak Line", "Build a three-match scoring streak.", user.best_streak, 3, "Consistency"),
        _achievement("no-hints-needed", "No Hints Needed", "Complete a match without using hints.", career_stats.no_hint_games, 1, "Discipline"),
        _achievement("near-perfect", "Near Perfect", "Score 4,900+ in a single round.", career_stats.near_perfect_rounds, 1, "Score"),
        _achievement("clean-sweep", "Clean Sweep", "Win ten PvE matches.", career_stats.pve_wins, 10, "PvE"),
        _achievement("needle-threader", "Needle Threader", "Place twenty-five guesses within 1 km.", career_stats.sub_1km_guesses, 25, "Precision"),
        _achievement("perfect-sightline", "Perfect Sightline", "Record twenty near-perfect rounds.", career_stats.near_perfect_rounds, 20, "Precision"),
        _achievement("silent-navigator", "Silent Navigator", "Complete twenty matches without hints.", career_stats.no_hint_games, 20, "Discipline"),
        _achievement("century-club", "Century Club", "Finish one hundred scored rounds.", career_stats.rounds_played, 100, "Volume"),
        _achievement("atlas-marathon", "Atlas Marathon", "Finish five hundred scored rounds.", career_stats.rounds_played, 500, "Legendary"),
        _achievement("untouchable", "Untouchable", "Reach a ten-match scoring streak.", user.best_streak, 10, "Legendary"),
        _achievement("grandmaster-cartographer", "Grandmaster Cartographer", "Score 24,500 points in one match.", user.best_score, 24500, "Legendary"),
        _achievement("million-point-club", "Million Point Club", "Bank one million lifetime points.", user.total_score, 1000000, "Legendary"),
    ]
    return UserProfileOut(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        games_played=user.games_played,
        total_score=user.total_score,
        best_score=user.best_score,
        current_streak=user.current_streak,
        best_streak=user.best_streak,
        average_score=user.average_score,
        career_stats=career_stats,
        world_coverage=WorldCoverage(
            points=coverage_points,
            routes=len(completed_games),
            total_score=sum(scores),
            latest_played_at=latest_played_at,
        ),
        achievements=achievements,
    )


@router.post("/register", response_model=AuthResponse)
async def register(credentials: AuthCredentials, db: Session = Depends(get_db)) -> AuthResponse:
    user = create_user_profile(db, credentials.email, credentials.password)
    return AuthResponse(access_token=create_access_token(user), user=build_profile_response(user, db))


@router.post("/login", response_model=AuthResponse)
async def login(credentials: AuthCredentials, db: Session = Depends(get_db)) -> AuthResponse:
    user = authenticate_user(db, credentials.email, credentials.password)
    return AuthResponse(access_token=create_access_token(user), user=build_profile_response(user, db))


@router.get("/me", response_model=UserProfileOut)
async def me(user: UserProfile = Depends(get_current_user), db: Session = Depends(get_db)) -> UserProfileOut:
    return build_profile_response(user, db)
