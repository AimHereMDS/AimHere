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
export type AiDifficulty = "cadet" | "navigator" | "cartographer" | "surveyor" | "oracle";

export type GameSetup = {
  mode: GameMode;
  location_mode: LocationMode;
  filter_text?: string;
  movement_mode: MovementMode;
  movement_limit: number;
  timer_seconds?: number | null;
  ai_difficulty?: AiDifficulty;
  hints_enabled?: boolean;
  show_ai_reasoning?: boolean;
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
  hintLog?: Hint[];
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

export type CoveragePoint = {
  lat: number;
  lng: number;
  label?: string | null;
  score: number;
  distance_km: number;
  hint_count: number;
  game_id: string;
  round_index: number;
  played_at?: string | null;
};

export type WorldCoverage = {
  points: CoveragePoint[];
  routes: number;
  total_score: number;
  latest_played_at?: string | null;
};

export type CareerStats = {
  rounds_played: number;
  best_round_score: number;
  average_round_score: number;
  average_distance_km?: number | null;
  closest_guess_km?: number | null;
  sub_1km_guesses: number;
  sub_10km_guesses: number;
  near_perfect_rounds: number;
  hints_used: number;
  average_hints_per_game: number;
  no_hint_games: number;
  pve_wins: number;
  pve_losses: number;
  pve_draws: number;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  progress: number;
  goal: number;
  category: string;
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
  career_stats?: CareerStats;
  world_coverage?: WorldCoverage;
  achievements?: Achievement[];
};
