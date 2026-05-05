from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class Coordinate(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    label: str | None = None


class PanoramaView(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    pano_id: str | None = Field(default=None, max_length=256)
    heading: float | None = None
    pitch: float | None = Field(default=None, ge=-90, le=90)
    fov: float | None = Field(default=None, ge=10, le=120)


class LocationRequest(BaseModel):
    mode: str = "default"
    filter_text: str | None = None
    count: int = Field(default=5, ge=1, le=10)


class LocationResponse(BaseModel):
    locations: list[Coordinate]


class GameCreate(BaseModel):
    mode: str = "single"
    location_mode: str = "default"
    filter_text: str | None = None
    movement_mode: str = "rotation"
    movement_limit: int = Field(default=5, ge=1, le=50)
    timer_seconds: int | None = Field(default=None, ge=15, le=900)
    ai_difficulty: str | None = "medium"


class GameOut(BaseModel):
    id: str
    mode: str
    locations: list[Coordinate]


class RoundSubmit(BaseModel):
    round_index: int = Field(ge=1, le=5)
    real: Coordinate
    guess: Coordinate
    hint_count: int = Field(default=0, ge=0, le=3)
    ai_difficulty: str | None = "medium"
    view: PanoramaView | None = None


class OpponentGuess(BaseModel):
    lat: float
    lng: float
    explanation: str
    difficulty: str


class RoundResult(BaseModel):
    round_id: str
    distance_km: float
    score: int
    ai_guess: OpponentGuess | None = None
    ai_distance_km: float | None = None
    ai_score: int | None = None
    rounds_won: int = 0
    ai_rounds_won: int = 0


class HintRequest(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    used_levels: int = Field(default=0, ge=0, le=2)
    view: PanoramaView | None = None


class HintResponse(BaseModel):
    level: int
    title: str
    hint: str
    max_score_multiplier: float


class UserProfileOut(BaseModel):
    id: str
    email: EmailStr
    display_name: str | None
    avatar_url: str | None
    games_played: int
    total_score: int
    best_score: int
    current_streak: int
    best_streak: int
    average_score: float

    model_config = {"from_attributes": True}


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    display_name: str | None
    total_score: int
    best_score: int
    games_played: int
    average_score: float
    updated_at: datetime | None = None
