import type { AiDifficulty, Coordinate, PanoramaView, RoundResult } from "../types/game";
import { apiFetch } from "../utils/api";

export async function submitPveRound(params: {
  gameId: string;
  roundIndex: number;
  real: Coordinate;
  guess: Coordinate;
  hintCount: number;
  aiDifficulty: AiDifficulty;
  view?: PanoramaView | null;
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
    }),
  });
}
