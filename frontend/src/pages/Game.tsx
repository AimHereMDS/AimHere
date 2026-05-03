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
  const [mapExpanded, setMapExpanded] = useState(false);

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
    setMapExpanded(true);
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
    setMapExpanded(false);
    setSecondsLeft(game.setup.timer_seconds ?? null);
  }

  const aiGuess = useMemo(() => (result?.ai_guess ? { lat: result.ai_guess.lat, lng: result.ai_guess.lng } : null), [result]);

  if (!game || !current) return null;

  return (
    <main className="relative h-screen overflow-hidden bg-black">
      {/* StreetView — full screen */}
      <div className="absolute inset-0">
        <StreetViewPanorama
          className="relative h-full overflow-hidden bg-slate-200"
          location={current}
          movementLimit={game.setup.movement_limit}
          movementMode={game.setup.movement_mode}
        />
      </div>

      {/* Top overlay — round info + timer + score */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-start justify-between p-4 pointer-events-none">
        <div className="rounded-lg bg-black/60 px-4 py-2 text-white backdrop-blur-sm pointer-events-auto">
          <h1 className="text-lg font-bold">Round {roundIndex} of 5</h1>
          <p className="text-xs text-white/70">
            {game.mode === "pve" ? "PvE match" : "Single player"} · {game.setup.movement_mode} movement
          </p>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          {secondsLeft !== null && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 font-semibold backdrop-blur-sm ${secondsLeft === 0 ? "bg-red-600/80 text-white" : "bg-black/60 text-white"}`}>
              <Clock size={18} />
              {secondsLeft}s
            </div>
          )}
          <div className="rounded-lg bg-black/60 px-3 py-2 font-semibold text-white backdrop-blur-sm">
            {totalScore(game.rounds).toLocaleString()} pts
          </div>
        </div>
      </div>

      {/* Bottom-left overlay — ScoreBoard + Hints */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-3 w-72">
        <ScoreBoard rounds={game.rounds} />
        <HintPanel disabled={roundComplete} location={current} onHintUsed={setHintsUsed} />
      </div>

      {/* Bottom-right overlay — Map + Submit */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2">
        {/* Result info */}
        {result && (
          <div className="w-full rounded-lg bg-black/70 px-4 py-3 text-white backdrop-blur-sm">
            <h2 className="font-semibold">{formatKm(result.distance_km)} away</h2>
            <p className="text-sm text-white/70">Round score: {result.score.toLocaleString()}</p>
            {result.ai_guess && (
              <p className="mt-2 text-xs text-white/60">
                AI: {formatKm(result.ai_distance_km ?? 0)} away · {result.ai_guess.explanation}
              </p>
            )}
          </div>
        )}

        {/* Map */}
        <div
          className={`overflow-hidden rounded-xl border-2 border-white/30 shadow-2xl transition-all duration-300 ${mapExpanded || roundComplete ? "h-80 w-[440px]" : "h-52 w-72"}`}
          onMouseEnter={() => setMapExpanded(true)}
          onMouseLeave={() => { if (!roundComplete) setMapExpanded(false); }}
        >
          <GuessMap aiGuess={aiGuess} guess={guess} locked={roundComplete} onGuess={setGuess} real={result ? current : undefined} />
        </div>

        {/* Submit / Next button */}
        {!result ? (
          <div className="flex items-center gap-2">
            {guess && (
              <div className="flex items-center gap-1 rounded-lg bg-black/60 px-3 py-2 text-sm text-white/80 backdrop-blur-sm">
                <MapPin size={14} />
                {guess.lat.toFixed(3)}, {guess.lng.toFixed(3)}
              </div>
            )}
            <button
              className="flex items-center gap-2 rounded-lg bg-field px-4 py-2 font-semibold text-white shadow-lg disabled:opacity-50"
              disabled={!canSubmit || secondsLeft === 0}
              onClick={submitRound}
              type="button"
            >
              <Flag size={18} />
              Submit guess
            </button>
          </div>
        ) : (
          <button
            className="rounded-lg bg-ink px-5 py-3 font-semibold text-white shadow-lg"
            onClick={nextRound}
            type="button"
          >
            {roundIndex >= 5 ? "View results" : "Next round"}
          </button>
        )}
      </div>
    </main>
  );
}
