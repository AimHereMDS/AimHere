import { Clock, Flag, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { submitPveRound } from "../agents/opponentAgent";
import { HintPanel } from "../components/HintPanel/HintPanel";
import { GuessMap } from "../components/Map/GuessMap";
import { ScoreBoard } from "../components/ScoreBoard/ScoreBoard";
import { StreetViewPanorama } from "../components/StreetView/StreetViewPanorama";
import type { ActiveGame, Coordinate, RoundResult } from "../types/game";
import { apiFetch } from "../utils/api";
import { formatKm, totalScore } from "../utils/geo";

function loadActiveGame(): ActiveGame | null {
  const raw = localStorage.getItem("aim-here-active-game");
  return raw ? (JSON.parse(raw) as ActiveGame) : null;
}

export function Game() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<ActiveGame | null>(() => loadActiveGame());
  const [guess, setGuess] = useState<Coordinate | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(game?.setup.timer_seconds ?? null);

  const roundIndex = (game?.rounds.length ?? 0) + 1;
  const current = game?.locations[roundIndex - 1] ?? null;
  const roundComplete = Boolean(result);

  useEffect(() => {
    if (!game || game.id !== gameId) navigate("/setup", { replace: true });
  }, [game, gameId, navigate]);

  useEffect(() => {
    if (!game?.setup.timer_seconds || roundComplete) return;
    setSecondsLeft(game.setup.timer_seconds);
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value === null) return value;
        if (value <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [roundIndex, game?.setup.timer_seconds, roundComplete]);

  const canSubmit = Boolean(guess && current && !result && !busy);

  async function submitRound() {
    if (!game || !guess || !current) return;
    setBusy(true);
    const payload = {
      round_index: roundIndex,
      real: current,
      guess,
      hint_count: hintsUsed,
      ai_difficulty: game.setup.ai_difficulty,
    };
    const response =
      game.mode === "pve"
        ? await submitPveRound({
            gameId: game.id,
            roundIndex,
            real: current,
            guess,
            hintCount: hintsUsed,
            aiDifficulty: game.setup.ai_difficulty ?? "medium",
          })
        : await apiFetch<RoundResult>(`/games/${game.id}/rounds`, { method: "POST", body: JSON.stringify(payload) });
    setResult(response);
    setBusy(false);
  }

  async function nextRound() {
    if (!game || !guess || !current || !result) return;
    const updated: ActiveGame = {
      ...game,
      rounds: [...game.rounds, { index: roundIndex, real: current, guess, result, hintsUsed }],
    };
    localStorage.setItem("aim-here-active-game", JSON.stringify(updated));
    if (roundIndex >= 5) {
      await apiFetch(`/games/${game.id}/finish`, { method: "POST" });
      localStorage.setItem("aim-here-last-game", JSON.stringify(updated));
      localStorage.removeItem("aim-here-active-game");
      navigate("/results");
      return;
    }
    setGame(updated);
    setGuess(null);
    setResult(null);
    setHintsUsed(0);
    setSecondsLeft(game.setup.timer_seconds ?? null);
  }

  const aiGuess = useMemo(() => (result?.ai_guess ? { lat: result.ai_guess.lat, lng: result.ai_guess.lng } : null), [result]);

  if (!game || !current) return null;

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Round {roundIndex} of 5</h1>
          <p className="text-sm text-slate-500">
            {game.mode === "pve" ? "PvE match" : "Single player"} · {game.setup.movement_mode} movement
          </p>
        </div>
        <div className="flex items-center gap-3">
          {secondsLeft !== null && (
            <div className={`flex items-center gap-2 rounded-md px-3 py-2 font-semibold ${secondsLeft === 0 ? "bg-red-100 text-red-700" : "bg-white text-slate-700"}`}>
              <Clock size={18} />
              {secondsLeft}s
            </div>
          )}
          <div className="rounded-md bg-white px-3 py-2 font-semibold text-field">
            Total {totalScore(game.rounds).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
        <StreetViewPanorama location={current} movementLimit={game.setup.movement_limit} movementMode={game.setup.movement_mode} />
        <GuessMap aiGuess={aiGuess} guess={guess} locked={roundComplete} onGuess={setGuess} real={result ? current : undefined} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          {!result ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin size={18} />
                {guess ? `Pin placed at ${guess.lat.toFixed(3)}, ${guess.lng.toFixed(3)}` : "Place a pin on the map."}
              </div>
              <button
                className="flex items-center gap-2 rounded-md bg-field px-4 py-2 font-semibold text-white disabled:opacity-50"
                disabled={!canSubmit || secondsLeft === 0}
                onClick={submitRound}
                type="button"
              >
                <Flag size={18} />
                Submit guess
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div>
                <h2 className="text-xl font-semibold text-ink">{formatKm(result.distance_km)} away</h2>
                <p className="mt-1 text-slate-600">Round score: {result.score.toLocaleString()}</p>
                {result.ai_guess && (
                  <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                    AI: {formatKm(result.ai_distance_km ?? 0)} away, {result.ai_score?.toLocaleString()} points. {result.ai_guess.explanation}
                  </p>
                )}
              </div>
              <button className="rounded-md bg-ink px-5 py-3 font-semibold text-white" onClick={nextRound} type="button">
                {roundIndex >= 5 ? "View results" : "Next round"}
              </button>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <HintPanel disabled={roundComplete} location={current} onHintUsed={setHintsUsed} />
          <ScoreBoard rounds={game.rounds} />
        </div>
      </div>
    </main>
  );
}

