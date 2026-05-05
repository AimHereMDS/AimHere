from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.agents.geo import haversine_km, score_from_distance
from app.agents.opponent_agent import opponent_guess
from app.database import get_db
from app.models.game import Game
from app.models.round import Round
from app.models.score import Score
from app.models.user import UserProfile
from app.routers.locations import random_street_view_locations
from app.agents.curator_agent import curate_locations
from app.schemas import GameCreate, GameOut, RoundResult, RoundSubmit
from app.security import get_current_user

router = APIRouter(prefix="/games", tags=["games"])


@router.post("", response_model=GameOut)
async def create_game(
    request: GameCreate,
    db: Session = Depends(get_db),
    user: UserProfile = Depends(get_current_user),
) -> GameOut:
    game = Game(
        user_id=user.id,
        mode=request.mode,
        location_mode=request.location_mode,
        filter_text=request.filter_text,
        movement_mode=request.movement_mode,
        movement_limit=request.movement_limit,
        timer_seconds=request.timer_seconds,
        ai_difficulty=request.ai_difficulty if request.mode == "pve" else None,
    )
    db.add(game)
    db.commit()
    db.refresh(game)
    if request.location_mode == "default":
        locations = await random_street_view_locations(5)
    else:
        locations = await curate_locations(request.filter_text or request.location_mode, 5)
    return GameOut(id=game.id, mode=game.mode, locations=locations)


@router.post("/{game_id}/rounds", response_model=RoundResult)
async def submit_round(
    game_id: str,
    request: RoundSubmit,
    db: Session = Depends(get_db),
    user: UserProfile = Depends(get_current_user),
) -> RoundResult:
    game = db.get(Game, game_id)
    if not game or game.user_id != user.id:
        raise HTTPException(status_code=404, detail="Game not found")

    distance = haversine_km(request.real.lat, request.real.lng, request.guess.lat, request.guess.lng)
    score = score_from_distance(distance, request.hint_count)
    ai_payload = None
    ai_distance = None
    ai_score = None
    if game.mode == "pve":
        ai_payload = await opponent_guess(
            request.real.lat,
            request.real.lng,
            request.ai_difficulty or game.ai_difficulty or "medium",
            request.view,
        )
        ai_distance = haversine_km(request.real.lat, request.real.lng, float(ai_payload["lat"]), float(ai_payload["lng"]))
        ai_score = score_from_distance(ai_distance, 0)
        if score >= ai_score:
            game.rounds_won += 1
        else:
            game.ai_rounds_won += 1
        game.ai_total_score += ai_score

    round_row = Round(
        game_id=game.id,
        round_index=request.round_index,
        real_lat=request.real.lat,
        real_lng=request.real.lng,
        guess_lat=request.guess.lat,
        guess_lng=request.guess.lng,
        distance_km=distance,
        score=score,
        hint_count=request.hint_count,
        ai_guess_lat=float(ai_payload["lat"]) if ai_payload else None,
        ai_guess_lng=float(ai_payload["lng"]) if ai_payload else None,
        ai_distance_km=ai_distance,
        ai_score=ai_score,
        ai_explanation=str(ai_payload["explanation"]) if ai_payload else None,
    )
    game.rounds_played += 1
    game.total_score += score
    db.add(round_row)
    db.commit()
    db.refresh(round_row)
    return RoundResult(
        round_id=round_row.id,
        distance_km=distance,
        score=score,
        ai_guess=ai_payload,
        ai_distance_km=ai_distance,
        ai_score=ai_score,
        rounds_won=game.rounds_won,
        ai_rounds_won=game.ai_rounds_won,
    )


@router.post("/{game_id}/finish")
async def finish_game(
    game_id: str,
    db: Session = Depends(get_db),
    user: UserProfile = Depends(get_current_user),
) -> dict:
    game = db.get(Game, game_id)
    if not game or game.user_id != user.id:
        raise HTTPException(status_code=404, detail="Game not found")
    if game.completed_at:
        return {"status": "already_completed", "total_score": game.total_score}
    game.completed_at = datetime.utcnow()
    score = Score(
        user_id=user.id,
        game_id=game.id,
        total_score=game.total_score,
        ai_total_score=game.ai_total_score if game.mode == "pve" else None,
        mode=game.mode,
    )
    user.games_played += 1
    user.total_score += game.total_score
    user.best_score = max(user.best_score, game.total_score)
    user.average_score = user.total_score / user.games_played
    if game.total_score >= 15000:
        user.current_streak += 1
        user.best_streak = max(user.best_streak, user.current_streak)
    else:
        user.current_streak = 0
    db.add(score)
    db.commit()
    return {
        "status": "completed",
        "total_score": game.total_score,
        "ai_total_score": game.ai_total_score,
        "rounds_won": game.rounds_won,
        "ai_rounds_won": game.ai_rounds_won,
    }
