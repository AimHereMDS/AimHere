import { Bot, ChevronDown, Lightbulb, RotateCcw, Trophy } from "lucide-react";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { AtlasStat, MiniWorldMap } from "../components/Atlas/Atlas";
import { SummaryMap } from "../components/Map/SummaryMap";
import type { ActiveGame, PlayedRound } from "../types/game";
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
  const averageDistance =
    game.rounds.length > 0 ? game.rounds.reduce((sum, round) => sum + round.result.distance_km, 0) / game.rounds.length : 0;
  const bestRound = [...game.rounds].sort((a, b) => b.result.score - a.result.score)[0];
  const hintsUsed = game.rounds.reduce((sum, round) => sum + round.hintsUsed, 0);

  return (
    <main className="app-shell">
      <div className="atlas-page">
        <section className="grid items-stretch gap-7 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="pt-3">
            <span className="chip chip-accent">
              <Trophy size={13} />
              Match complete
            </span>
            <h1 className="serif atlas-title mt-5">
              {score >= 18000 ? "Cartographer's hand." : score >= 12000 ? "Steady navigator." : score >= 6000 ? "Roving traveler." : "Marooned."}
            </h1>

            <div className="mt-7 flex flex-wrap items-end gap-8 border-b border-dashed border-[var(--line)] pb-6">
              <div>
                <div className="serif text-7xl leading-none text-[var(--accent)] md:text-8xl">{score.toLocaleString()}</div>
                <div className="eyebrow mt-2">Your total · /25,000</div>
              </div>
              {isPve && (
                <div>
                  <div className="serif text-5xl leading-none text-[var(--ai)] md:text-6xl">{aiScore.toLocaleString()}</div>
                  <div className="eyebrow mt-2">AI rival</div>
                </div>
              )}
            </div>

            {isPve && (
              <div
                className={`mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                  playerWon
                    ? "border-[color-mix(in_oklab,var(--pos),transparent_60%)] bg-[var(--pos-soft)] text-[var(--pos)]"
                    : score === aiScore
                      ? "border-[var(--line)] bg-[var(--bg-card)] text-[var(--ink-2)]"
                      : "border-[color-mix(in_oklab,var(--neg),transparent_60%)] bg-[var(--neg-soft)] text-[var(--neg)]"
                }`}
              >
                <span className="mono">{playerWon ? "YOU WIN" : score === aiScore ? "TIED" : "AI WINS"}</span>
                <span>· {roundsWon}/5 rounds won</span>
              </div>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="btn-gg" to="/setup">
                <RotateCcw size={18} />
                Play again
              </Link>
              <Link className="btn-secondary" to="/leaderboard">
                <Trophy size={18} />
                Leaderboard
              </Link>
            </div>
          </div>

          <div className="surface p-5">
            <div className="eyebrow">Stat sheet</div>
            <div className="mt-5 grid grid-cols-2 gap-5">
              <AtlasStat label="Avg distance" size="sm" value={formatKm(averageDistance)} />
              <AtlasStat label="Best round" hint={bestRound ? `${bestRound.result.score.toLocaleString()} pts` : undefined} size="sm" value={bestRound ? `R${bestRound.index}` : "-"} />
              <AtlasStat label="Hints used" size="sm" value={hintsUsed} />
              <AtlasStat label="Rounds" size="sm" value={game.rounds.length} />
            </div>
            <div className="mt-5 overflow-hidden rounded-md border border-[var(--line)] bg-[var(--bg-inset)]">
              <div className="h-48">
                <MiniWorldMap
                  pins={game.rounds.map((round, index) => ({
                    x: 180 + index * 145,
                    y: 170 + ((round.index * 37) % 120),
                    color: "var(--accent)",
                  }))}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-7 lg:grid-cols-[1fr_380px]">
          <div className="surface overflow-hidden p-2">
            <SummaryMap rounds={game.rounds} />
          </div>
          <div className="space-y-3">
            {game.rounds.map((round) => (
              <RoundCard isPve={isPve} key={round.index} round={round} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

type RoundCardProps = {
  round: PlayedRound;
  isPve: boolean;
};

function RoundCard({ round, isPve }: RoundCardProps) {
  const hints = round.hintLog ?? round.hints ?? [];
  const aiGuess = round.result.ai_guess;
  const showAiSection = isPve && Boolean(aiGuess);
  const [showHints, setShowHints] = useState(false);
  const [showAi, setShowAi] = useState(false);

  return (
    <div className="surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]">Round · 0{round.index}</span>
        <span className="mono text-[var(--accent)]">+{round.result.score.toLocaleString()}</span>
      </div>
      <div className="serif text-xl text-[var(--ink)]">{formatKm(round.result.distance_km)} away</div>
      <div className="mt-3 h-28 overflow-hidden rounded-md border border-[var(--line)] bg-[var(--bg-inset)]">
        <MiniWorldMap
          pins={[
            { x: 470 + round.index * 8, y: 238 + round.index * 4, color: "var(--accent)" },
            ...(showAiSection ? [{ x: 515 + round.index * 5, y: 250, color: "var(--ai)" }] : []),
          ]}
          target={{ x: 500, y: 245, color: "var(--pos)" }}
        />
      </div>
      {hints.length > 0 && (
        <div className="mt-3 border-t border-[var(--line)] pt-3">
          <button
            className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--hint)]"
            onClick={() => setShowHints((value) => !value)}
            type="button"
          >
            <span className="flex items-center gap-1.5">
              <Lightbulb size={14} />
              Hint log ({hints.length})
            </span>
            <ChevronDown className={`transition-transform ${showHints ? "rotate-180" : ""}`} size={14} />
          </button>
          {showHints && (
            <div className="mt-2 space-y-1.5">
              {hints.map((hint) => (
                <p className="text-xs leading-5 text-[var(--ink-3)]" key={hint.level}>
                  <span className="font-semibold text-[var(--ink-2)]">{hint.title}:</span> {hint.hint}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
      {showAiSection && aiGuess && (
        <div className="mt-3 border-t border-[var(--line)] pt-3">
          <button
            className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold text-[var(--ai)]"
            onClick={() => setShowAi((value) => !value)}
            type="button"
          >
            <span className="flex items-center gap-1.5">
              <Bot size={14} />
              AI +{(round.result.ai_score ?? 0).toLocaleString()} ({formatKm(round.result.ai_distance_km ?? 0)})
            </span>
            <ChevronDown className={`transition-transform ${showAi ? "rotate-180" : ""}`} size={14} />
          </button>
          {showAi && (
            <p className="mt-2 text-xs leading-5 text-[var(--ink-3)]">
              <span className="font-semibold text-[var(--ink-2)]">Reasoning:</span> {aiGuess.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
