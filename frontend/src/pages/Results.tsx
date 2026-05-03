import { Link, Navigate } from "react-router-dom";

import { SummaryMap } from "../components/Map/SummaryMap";
import type { ActiveGame } from "../types/game";
import { formatKm, totalScore } from "../utils/geo";

function lastGame(): ActiveGame | null {
  const raw = localStorage.getItem("aim-here-last-game");
  return raw ? (JSON.parse(raw) as ActiveGame) : null;
}

export function Results() {
  const game = lastGame();
  if (!game) return <Navigate to="/setup" replace />;
  const score = totalScore(game.rounds);
  const aiScore = game.rounds.reduce((sum, round) => sum + (round.result.ai_score ?? 0), 0);
  const roundsWon = game.rounds.filter((round) => round.result.score >= (round.result.ai_score ?? -1)).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">Game results</h1>
          <p className="mt-2 text-slate-600">Total score: {score.toLocaleString()}</p>
          {game.mode === "pve" && (
            <p className="mt-1 text-slate-600">
              PvE: you won {roundsWon}/5 rounds · AI score {aiScore.toLocaleString()}
            </p>
          )}
        </div>
        <Link className="rounded-md bg-field px-5 py-3 font-semibold text-white" to="/setup">
          Play again
        </Link>
      </div>
      <SummaryMap rounds={game.rounds} />
      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {game.rounds.map((round) => (
          <div className="rounded-lg border border-slate-200 bg-white p-4" key={round.index}>
            <div className="text-sm font-semibold text-slate-500">Round {round.index}</div>
            <div className="mt-2 text-xl font-bold text-ink">{round.result.score}</div>
            <div className="mt-1 text-sm text-slate-600">{formatKm(round.result.distance_km)}</div>
          </div>
        ))}
      </div>
    </main>
  );
}

