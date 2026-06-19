import type { AiDifficulty, Coordinate, OpponentGuess, PanoramaView, RoundResult } from "../types/game";
import { apiFetch } from "../utils/api";

export async function prefetchOpponentGuess(params: {
  gameId: string;
  roundIndex: number;
  real: Coordinate;
  aiDifficulty: AiDifficulty;
  view?: PanoramaView | null;
}) {
  return apiFetch<OpponentGuess>(`/games/${params.gameId}/opponent-guess`, {
    method: "POST",
    body: JSON.stringify({
      round_index: params.roundIndex,
      real: params.real,
      ai_difficulty: params.aiDifficulty,
      view: params.view,
    }),
    timeoutMs: 90000,
    timeoutMessage: "AI opponent is still thinking",
  });
}

export async function submitPveRound(params: {
  gameId: string;
  roundIndex: number;
  real: Coordinate;
  guess: Coordinate;
  hintCount: number;
  aiDifficulty: AiDifficulty;
  view?: PanoramaView | null;
  prefetchedAiGuess?: OpponentGuess | null;
}) {
  return apiFetch<RoundResult>(`/games/${params.gameId}/rounds`, {
    method: "POST",
    body: JSON.stringify({
      round_index: params.roundIndex,
      real: params.real,
      guess: params.guess,
      hint_count: params.hintCount,
      ai_difficulty: params.aiDifficulty,
      view: params.view,
      prefetched_ai_guess: params.prefetchedAiGuess,
    }),
  });
}
