import { Bot, Clock, Flag, Lightbulb, MapPin, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { submitPveRound } from "../agents/opponentAgent";
import { HintPanel } from "../components/HintPanel/HintPanel";
import { GuessMap } from "../components/Map/GuessMap";
import { ScoreBoard } from "../components/ScoreBoard/ScoreBoard";
import { StreetViewPanorama } from "../components/StreetView/StreetViewPanorama";
import type { ActiveGame, Coordinate, Hint, PanoramaView, RoundResult } from "../types/game";
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
  const [roundHints, setRoundHints] = useState<Hint[]>([]);
  const hintsUsed = roundHints.length;
  const [panoramaView, setPanoramaView] = useState<PanoramaView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(game?.setup.timer_seconds ?? null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const timerSubmitRef = useRef(false);

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

  const submitRound = useCallback(async () => {
    if (!game || !guess || !current) return;
    setBusy(true);
    setError("");
    try {
      const payload = {
        round_index: roundIndex,
        real: current,
        guess,
        hint_count: hintsUsed,
        ai_difficulty: game.setup.ai_difficulty,
        view: panoramaView,
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
              view: panoramaView,
            })
          : await apiFetch<RoundResult>(`/games/${game.id}/rounds`, { method: "POST", body: JSON.stringify(payload) });
      setResult(response);
      setMapExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit round");
    } finally {
      setBusy(false);
    }
  }, [game, guess, current, roundIndex, hintsUsed, panoramaView]);

  useEffect(() => {
    if (secondsLeft === 0 && canSubmit && !timerSubmitRef.current) {
      timerSubmitRef.current = true;
      void submitRound();
    }
  }, [secondsLeft, canSubmit, submitRound]);

  async function nextRound() {
    if (!game || !guess || !current || !result) return;
    const updated: ActiveGame = {
      ...game,
      rounds: [...game.rounds, { index: roundIndex, real: current, guess, result, hintsUsed, hints: roundHints }],
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
    setRoundHints([]);
    setPanoramaView(null);
    setError("");
    setMapExpanded(false);
    timerSubmitRef.current = false;
    setSecondsLeft(game.setup.timer_seconds ?? null);
  }

  const aiGuess = useMemo(() => (result?.ai_guess ? { lat: result.ai_guess.lat, lng: result.ai_guess.lng } : null), [result]);

  if (!game || !current) return null;

  return (
    <main className="relative h-[calc(100vh-72px)] overflow-hidden bg-black">
      <div className="absolute inset-0">
        <StreetViewPanorama
          className="relative h-full overflow-hidden bg-slate-200"
          location={current}
          movementLimit={game.setup.movement_limit}
          movementMode={game.setup.movement_mode}
          onViewChange={setPanoramaView}
        />
      </div>

      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-start justify-between p-4">
        <div className="panel-soft pointer-events-auto px-4 py-3 text-white">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-teal-300">Round {roundIndex} / 5</div>
          <p className="mt-1 text-sm text-white/75">
            {game.mode === "pve" ? "PvE match" : "Solo match"} / {game.setup.movement_mode} movement
          </p>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {secondsLeft !== null && (
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-black backdrop-blur-sm ${secondsLeft <= 10 ? "border-red-400/50 bg-red-600/70 text-white" : "border-white/10 bg-black/55 text-white"}`}>
              <Clock size={18} />
              {secondsLeft}s
            </div>
          )}
          {game.mode === "pve" && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 font-black text-amber-200 backdrop-blur-sm">
              <Bot size={18} />
              AI {game.rounds.reduce((sum, round) => sum + (round.result.ai_score ?? 0), 0).toLocaleString()}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/55 px-3 py-2 font-black text-white backdrop-blur-sm">
            <Trophy size={18} />
            {totalScore(game.rounds).toLocaleString()} pts
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-3 w-72">
        <ScoreBoard rounds={game.rounds} />
        <HintPanel key={`${game.id}-${roundIndex}`} disabled={roundComplete} location={current} onHintsUpdate={setRoundHints} view={panoramaView} />
      </div>

      <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2">
        {result && (
          <div className="panel-soft w-full max-w-[440px] px-4 py-3 text-white">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-teal-300">Your guess</div>
            <h2 className="mt-1 text-2xl font-black">+{result.score.toLocaleString()}</h2>
            <p className="text-sm text-white/70">{formatKm(result.distance_km)} away</p>
            {roundHints.length > 0 && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <div className="flex items-center gap-2 text-sm font-black text-amber-300">
                  <Lightbulb size={16} />
                  Hints used ({roundHints.length})
                </div>
                <div className="mt-2 space-y-2">
                  {roundHints.map((h) => (
                    <div key={h.level} className="text-xs leading-5 text-white/65">
                      <span className="font-bold text-slate-300">{h.title}:</span> {h.hint}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.ai_guess && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <div className="flex items-center gap-2 text-sm font-black text-amber-200">
                  <Bot size={16} />
                  AI +{(result.ai_score ?? 0).toLocaleString()} / {formatKm(result.ai_distance_km ?? 0)} away
                </div>
                <p className="mt-1 text-xs leading-5 text-white/65">
                  <span className="font-bold text-slate-300">Reasoning:</span> {result.ai_guess.explanation}
                </p>
              </div>
            )}
          </div>
        )}
        {error && <div className="max-w-[440px] rounded-md border border-red-400/40 bg-red-600/30 px-4 py-2 text-sm text-red-100 backdrop-blur">{error}</div>}

        <div
          className={`overflow-hidden rounded-xl border-2 border-white/25 shadow-2xl transition-all duration-300 ${mapExpanded || roundComplete ? "h-80 w-[440px]" : "h-52 w-72"}`}
          onMouseEnter={() => setMapExpanded(true)}
          onMouseLeave={() => { if (!roundComplete && !guess) setMapExpanded(false); }}
        >
          <GuessMap aiGuess={aiGuess} guess={guess} locked={roundComplete} onGuess={setGuess} real={result ? current : undefined} />
        </div>

        {!result ? (
          <div className="flex items-center gap-2">
            {guess && (
              <div className="flex items-center gap-1 rounded-lg bg-black/60 px-3 py-2 text-sm text-white/80 backdrop-blur-sm">
                <MapPin size={14} />
                {guess.lat.toFixed(3)}, {guess.lng.toFixed(3)}
              </div>
            )}
            <button
              className="flex items-center gap-2 rounded-lg bg-teal-400 px-4 py-2 font-black text-slate-950 shadow-lg disabled:opacity-50"
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
            className="rounded-lg bg-slate-950 px-5 py-3 font-black text-white shadow-lg ring-1 ring-white/10"
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
