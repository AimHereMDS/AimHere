import { Bot, Lightbulb, RotateCcw, Trophy } from "lucide-react";
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
  const pveRounds = game.rounds.filter((round) => round.result.ai_distance_km !== null && round.result.ai_distance_km !== undefined);
  const averageDistanceDelta =
    pveRounds.length > 0
      ? pveRounds.reduce((sum, round) => sum + ((round.result.ai_distance_km ?? 0) - round.result.distance_km), 0) / pveRounds.length
      : 0;

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
          <div className="mt-3 text-slate-300">
            <p>
              AI scored <span className="font-black text-amber-300">{aiScore.toLocaleString()}</span> / you won {roundsWon}/5 rounds /{" "}
              <span className={playerWon ? "font-black uppercase text-teal-300" : score === aiScore ? "font-black uppercase text-slate-200" : "font-black uppercase text-red-300"}>
                {playerWon ? "You win" : score === aiScore ? "Tied" : "AI wins"}
              </span>
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Average distance difference:{" "}
              <span className={averageDistanceDelta >= 0 ? "font-black text-teal-300" : "font-black text-red-300"}>
                {averageDistanceDelta >= 0 ? "+" : ""}
                {formatKm(Math.abs(averageDistanceDelta))}
              </span>{" "}
              vs AI
            </p>
          </div>
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
                <div className="mt-2 space-y-1.5 text-xs text-amber-200">
                  <div className="flex items-center gap-1.5">
                    <Bot size={14} />
                    AI +{(round.result.ai_score ?? 0).toLocaleString()} ({formatKm(round.result.ai_distance_km ?? 0)})
                  </div>
                  <p className="leading-5 text-amber-100/75">{round.result.ai_guess.explanation}</p>
                </div>
              )}
              {(round.hintLog?.length ?? 0) > 0 && (
                <div className="mt-3 border-t border-white/10 pt-3">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-amber-200">
                    <Lightbulb size={14} />
                    Hint log
                  </div>
                  <div className="space-y-1.5">
                    {round.hintLog.map((hint) => (
                      <p className="text-xs leading-5 text-slate-400" key={hint.level}>
                        <span className="font-black text-slate-200">{hint.title}:</span> {hint.hint}
                      </p>
                    ))}
                  </div>
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

    </main>
  );
}
