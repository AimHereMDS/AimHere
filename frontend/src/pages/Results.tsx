import { Bot, RotateCcw, Trophy } from "lucide-react";
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
  const isPve = game.mode === "pve";
  const playerWon = isPve && score > aiScore;

  return (
    <main className="app-shell mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 text-center">
        <div className="chip chip-amber mb-4">
          <Trophy size={14} />
          Game complete
        </div>
        <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Final score</div>
        <h1 className="mt-2 text-6xl font-black tracking-tight text-teal-300 md:text-7xl">
          {score.toLocaleString()}
          <span className="text-2xl text-slate-400"> / 25,000</span>
        </h1>
        {isPve && (
          <p className="mt-3 text-slate-300">
            AI scored <span className="font-black text-amber-300">{aiScore.toLocaleString()}</span> / you won {roundsWon}/5 rounds /{" "}
            <span className={playerWon ? "font-black uppercase text-teal-300" : score === aiScore ? "font-black uppercase text-slate-200" : "font-black uppercase text-red-300"}>
              {playerWon ? "You win" : score === aiScore ? "Tied" : "AI wins"}
            </span>
          </p>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="panel overflow-hidden p-2">
          <SummaryMap rounds={game.rounds} />
        </div>
        <div className="space-y-3">
          {game.rounds.map((round) => (
            <div className="panel p-4" key={round.index}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Round {round.index}</span>
                <span className="font-black text-teal-300">+{round.result.score.toLocaleString()}</span>
              </div>
              <div className="text-sm text-slate-300">
                {formatKm(round.result.distance_km)} away
                {round.hintsUsed > 0 && ` / ${round.hintsUsed} hint${round.hintsUsed > 1 ? "s" : ""}`}
              </div>
              {isPve && round.result.ai_guess && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-200">
                  <Bot size={14} />
                  AI +{(round.result.ai_score ?? 0).toLocaleString()} ({formatKm(round.result.ai_distance_km ?? 0)})
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Link className="btn-gg" to="/setup">
          <RotateCcw size={18} />
          Play again
        </Link>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-5">
        {game.rounds.map((round) => (
          <div className="panel-soft p-4" key={round.index}>
            <div className="text-sm font-black text-slate-400">Round {round.index}</div>
            <div className="mt-2 text-xl font-black text-white">{round.result.score.toLocaleString()}</div>
            <div className="mt-1 text-sm text-slate-300">{formatKm(round.result.distance_km)}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
