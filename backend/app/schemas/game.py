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


class OpponentGuess(BaseModel):
    lat: float
    lng: float
    explanation: str
    difficulty: str


class RoundSubmit(BaseModel):
    round_index: int = Field(ge=1, le=5)
    real: Coordinate
    guess: Coordinate
    hint_count: int = Field(default=0, ge=0, le=3)
    ai_difficulty: str | None = "medium"
    view: PanoramaView | None = None
    prefetched_ai_guess: OpponentGuess | None = None


class OpponentGuessRequest(BaseModel):
    round_index: int = Field(ge=1, le=5)
    real: Coordinate
    ai_difficulty: str | None = "medium"
    view: PanoramaView | None = None


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
    source_prompt: str | None = Field(default=None, max_length=300)


class HintResponse(BaseModel):
    level: int
    title: str
    hint: str
    max_score_multiplier: float


class CoveragePoint(BaseModel):
    lat: float
    lng: float
    label: str | None = None
    score: int
    distance_km: float
    hint_count: int
    game_id: str
    round_index: int
    played_at: datetime | None = None


class WorldCoverage(BaseModel):
    points: list[CoveragePoint] = Field(default_factory=list)
    routes: int = 0
    total_score: int = 0
    latest_played_at: datetime | None = None


class CareerStats(BaseModel):
    rounds_played: int = 0
    best_round_score: int = 0
    average_round_score: float = 0.0
    average_distance_km: float | None = None
    closest_guess_km: float | None = None
    sub_1km_guesses: int = 0
    sub_10km_guesses: int = 0
    near_perfect_rounds: int = 0
    hints_used: int = 0
    average_hints_per_game: float = 0.0
    no_hint_games: int = 0
    pve_wins: int = 0
    pve_losses: int = 0
    pve_draws: int = 0


class AchievementOut(BaseModel):
    id: str
    title: str
    description: str
    earned: bool
    progress: float
    goal: float
    category: str


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
    career_stats: CareerStats = Field(default_factory=CareerStats)
    world_coverage: WorldCoverage = Field(default_factory=WorldCoverage)
    achievements: list[AchievementOut] = Field(default_factory=list)

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
