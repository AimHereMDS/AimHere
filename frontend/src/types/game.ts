export type Coordinate = {
  lat: number;
  lng: number;
  label?: string | null;
};

export type PanoramaView = {
  lat: number;
  lng: number;
  pano_id?: string | null;
  heading?: number | null;
  pitch?: number | null;
  fov?: number | null;
};

export type MovementMode = "rotation" | "limited" | "full";
export type GameMode = "single" | "pve";
export type LocationMode = "default" | "custom" | "filter";
export type AiDifficulty = "easy" | "medium" | "hard";

export type GameSetup = {
  mode: GameMode;
  location_mode: LocationMode;
  filter_text?: string;
  movement_mode: MovementMode;
  movement_limit: number;
  timer_seconds?: number | null;
  ai_difficulty?: AiDifficulty;
};

export type RoundResult = {
  round_id: string;
  distance_km: number;
  score: number;
  ai_guess?: {
    lat: number;
    lng: number;
    explanation: string;
    difficulty: AiDifficulty;
  } | null;
  ai_distance_km?: number | null;
  ai_score?: number | null;
  rounds_won: number;
  ai_rounds_won: number;
};

export type PlayedRound = {
  index: number;
  real: Coordinate;
  guess: Coordinate;
  result: RoundResult;
  hintsUsed: number;
  hints?: Hint[];
};

export type ActiveGame = {
  id: string;
  mode: GameMode;
  setup: GameSetup;
  locations: Coordinate[];
  rounds: PlayedRound[];
};

export type Hint = {
  level: number;
  title: string;
  hint: string;
  max_score_multiplier: number;
};

export type Profile = {
  id: string;
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
  games_played: number;
  total_score: number;
  best_score: number;
  current_streak: number;
  best_streak: number;
  average_score: number;
};
