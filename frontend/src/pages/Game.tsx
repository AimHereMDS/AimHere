import { Bot, ChevronDown, Clock, DoorOpen, Flag, Lightbulb, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { curateLocations } from "../agents/curatorAgent";
import { submitPveRound } from "../agents/opponentAgent";
import { AtlasLogo, CompassRose } from "../components/Atlas/Atlas";
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
  const [showHintLog, setShowHintLog] = useState(false);
  const [showFullReasoning, setShowFullReasoning] = useState(false);
  const timerSubmitRef = useRef(false);
  const panoramaRetriesRef = useRef<Map<number, number>>(new Map());
  const replacingLocationRef = useRef(false);

  const MAX_PANORAMA_RETRIES = 2;

  useEffect(() => {
    if (!result) return;
    setShowHintLog(false);
    setShowFullReasoning(false);
  }, [result]);

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
      rounds: [...game.rounds, { index: roundIndex, real: current, guess, result, hintsUsed, hintLog: roundHints }],
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

  const handlePanoramaUnavailable = useCallback(async () => {
    if (replacingLocationRef.current || !game || result) return;
    const previousAttempts = panoramaRetriesRef.current.get(roundIndex) ?? 0;
    if (previousAttempts >= MAX_PANORAMA_RETRIES) {
      setError("This location has no Street View. Submit your best guess to continue.");
      return;
    }
    panoramaRetriesRef.current.set(roundIndex, previousAttempts + 1);
    replacingLocationRef.current = true;
    try {
      const { locations } = await curateLocations(
        game.setup.location_mode,
        game.setup.filter_text,
        1,
      );
      const replacement = locations[0];
      if (!replacement) return;
      const updatedLocations = [...game.locations];
      updatedLocations[roundIndex - 1] = replacement;
      const updatedGame: ActiveGame = { ...game, locations: updatedLocations };
      localStorage.setItem("aim-here-active-game", JSON.stringify(updatedGame));
      setGame(updatedGame);
      setPanoramaView(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load a replacement location");
    } finally {
      replacingLocationRef.current = false;
    }
  }, [game, result, roundIndex]);

  const aiGuess = useMemo(() => (result?.ai_guess ? { lat: result.ai_guess.lat, lng: result.ai_guess.lng } : null), [result]);

  function saveAndExit() {
    if (!game) return;
    const savedGame =
      result && guess && current
        ? {
            ...game,
            rounds: [...game.rounds, { index: roundIndex, real: current, guess, result, hintsUsed, hintLog: roundHints }],
          }
        : game;
    localStorage.setItem("aim-here-active-game", JSON.stringify(savedGame));
    navigate("/");
  }

  if (!game || !current) return null;

  return (
    <main className="atlas-game-root">
      <div className="absolute inset-0">
        <StreetViewPanorama
          key={`${game.id}-${roundIndex}-${current.lat},${current.lng}`}
          className="relative h-full overflow-hidden bg-black"
          location={current}
          movementLimit={game.setup.movement_limit}
          movementMode={game.setup.movement_mode}
          onPanoramaUnavailable={handlePanoramaUnavailable}
          onViewChange={setPanoramaView}
        />
      </div>

      <div className="hud-top pointer-events-none">
        <div className="pointer-events-auto flex flex-wrap items-center gap-3">
          <button className="hud-glass flex h-10 w-10 items-center justify-center p-0" onClick={saveAndExit} title="Save and exit" type="button">
            <AtlasLogo size={22} />
          </button>
          <div className="hud-glass flex items-center gap-3 px-4 py-2">
            <span className="eyebrow text-[9.5px]">Round</span>
            <div className="hud-round-dots">
              {[1, 2, 3, 4, 5].map((round) => (
                <span
                  className={`hud-round-dot ${round === roundIndex ? "is-now" : round < roundIndex ? "is-done" : ""}`}
                  key={round}
                />
              ))}
            </div>
            <span className="mono text-xs tracking-[0.1em] text-[var(--accent)]">
              {String(roundIndex).padStart(2, "0")}/05
            </span>
          </div>
          <div className="hud-glass hidden flex-col px-3 py-2 md:flex">
            <span className="eyebrow text-[9px]">Mode</span>
            <span className="mono text-xs text-[var(--ink)]">
              {game.mode === "pve" ? "VS AI" : "Solo"} · {game.setup.movement_mode}
            </span>
          </div>
          <button
            className="hud-glass inline-flex items-center gap-1.5 px-3 py-2 text-xs text-[var(--ink-2)] transition hover:text-[var(--ink)]"
            onClick={saveAndExit}
            type="button"
          >
            <DoorOpen size={14} />
            Save & exit
          </button>
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          {secondsLeft !== null && (
            <div className={`hud-glass flex items-center gap-2 px-3 py-2 font-semibold ${secondsLeft <= 10 ? "border-[var(--neg)] text-[var(--neg)]" : ""}`}>
              <Clock size={18} />
              <span className="mono">{secondsLeft}s</span>
            </div>
          )}
          {game.mode === "pve" && (
            <div className="hud-glass flex items-center gap-2 px-3 py-2 font-semibold text-[var(--ai)]">
              <Bot size={18} />
              <span className="mono">AI {game.rounds.reduce((sum, round) => sum + (round.result.ai_score ?? 0), 0).toLocaleString()}</span>
            </div>
          )}
          <div className="hud-glass flex items-center gap-2 px-3 py-2 font-semibold">
            <Trophy size={18} />
            <span className="mono">{totalScore(game.rounds).toLocaleString()}</span>
            <span className="eyebrow text-[9px]">pts</span>
          </div>
        </div>
      </div>

      <div className="hud-coord-strip mono">
        <span>FRAME · 0{roundIndex}1</span>
        <span>·</span>
        <span>BEARING {Math.round(panoramaView?.heading ?? 0).toString().padStart(3, "0")}</span>
        <span>·</span>
        <span>FOV {Math.round(panoramaView?.fov ?? 90)}</span>
      </div>

      <div className="hud-left">
        <div className="hud-glass hud-compass">
          <CompassRose size={64} />
        </div>
        <HintPanel key={`${game.id}-${roundIndex}`} disabled={roundComplete} location={current} onHintsChange={setRoundHints} view={panoramaView} />
      </div>

      <div className="hud-rounds-summary">
        <ScoreBoard rounds={game.rounds} />
      </div>

      <div className="hud-map">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="eyebrow text-[var(--accent)]">{guess ? "Pin placed" : "Drop your guess"}</span>
            {guess && (
              <div className="mono mt-1 text-xs text-[var(--ink-2)]">
                {guess.lat.toFixed(3)}, {guess.lng.toFixed(3)}
              </div>
            )}
          </div>
          {result && <span className="mono text-sm text-[var(--accent)]">+{result.score.toLocaleString()}</span>}
        </div>
        {error && <div className="rounded-md border border-[color-mix(in_oklab,var(--neg),transparent_55%)] bg-[var(--neg-soft)] px-4 py-2 text-sm text-[var(--ink)]">{error}</div>}

        <div
          className={`hud-map-canvas transition-all duration-300 ${mapExpanded || roundComplete ? "h-[min(20rem,45vh)]" : "h-52"}`}
          onMouseEnter={() => setMapExpanded(true)}
          onMouseLeave={() => { if (!roundComplete && !guess) setMapExpanded(false); }}
        >
          <GuessMap
            aiGuess={aiGuess}
            distanceKm={result?.distance_km}
            guess={guess}
            locked={roundComplete}
            onGuess={setGuess}
            real={result ? current : undefined}
          />
        </div>

        {!result ? (
          <button
            className="btn-gg w-full disabled:opacity-50"
            disabled={!canSubmit || secondsLeft === 0}
            onClick={submitRound}
            type="button"
          >
            <Flag size={18} />
            Submit guess
          </button>
        ) : (
          <button
            className="btn-gg w-full"
            onClick={nextRound}
            type="button"
          >
            {roundIndex >= 5 ? "View results" : "Next round"}
          </button>
        )}
      </div>

      {result && (
        <div className="hud-result">
          <div className="hud-result-card">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <div>
                <span className="eyebrow">Round {roundIndex} · result</span>
                <h2 className="serif mt-3 text-5xl leading-none text-[var(--ink)] md:text-6xl">
                  {result.score >= 4000 ? "Pinpoint." : result.score >= 2500 ? "Solid read." : result.score >= 800 ? "Close-ish." : "Off the map."}
                </h2>
                <div className="mt-6 flex flex-wrap gap-8">
                  <div>
                    <div className="eyebrow">Distance</div>
                    <div className="serif mt-1 text-5xl text-[var(--ink)]">
                      {formatKm(result.distance_km)}
                    </div>
                  </div>
                  <div>
                    <div className="eyebrow">Earned</div>
                    <div className="serif mt-1 text-5xl text-[var(--accent)]">
                      {result.score.toLocaleString()}
                    </div>
                  </div>
                  {result.ai_guess && (
                    <div>
                      <div className="eyebrow">AI rival</div>
                      <div className="serif mt-1 text-5xl text-[var(--ai)]">
                        {(result.ai_score ?? 0).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="min-h-0 overflow-y-auto rounded-md border border-[var(--line)] bg-[var(--bg-inset)] p-4">
                <div className="eyebrow text-[var(--accent)]">Round notes</div>
                <p className="mt-2 text-sm text-[var(--ink-2)]">{formatKm(result.distance_km)} away from the actual panorama.</p>
            {roundHints.length > 0 && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <button
                  className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-[var(--hint)]"
                  onClick={() => setShowHintLog((value) => !value)}
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <Lightbulb size={16} />
                    Hint log ({roundHints.length})
                  </span>
                  <ChevronDown
                    className={`text-slate-300 transition-transform ${showHintLog ? "rotate-180" : ""}`}
                    size={16}
                  />
                </button>
                {showHintLog && (
                  <div className="mt-2 space-y-1.5">
                    {roundHints.map((hint) => (
                      <p className="text-xs leading-5 text-[var(--ink-3)]" key={hint.level}>
                        <span className="font-semibold text-[var(--ink-2)]">{hint.title}:</span> {hint.hint}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {result.ai_guess && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ai)]">
                  <Bot size={16} />
                  AI +{(result.ai_score ?? 0).toLocaleString()} / {formatKm(result.ai_distance_km ?? 0)} away
                </div>
                <p
                  className={`mt-1 text-xs leading-5 text-[var(--ink-3)] ${showFullReasoning ? "" : "line-clamp-2"}`}
                >
                  <span className="font-semibold text-[var(--ink-2)]">Reasoning:</span> {result.ai_guess.explanation}
                </p>
                {result.ai_guess.explanation.length > 140 && (
                  <button
                    className="mt-1 text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hi)]"
                    onClick={() => setShowFullReasoning((value) => !value)}
                    type="button"
                  >
                    {showFullReasoning ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            )}
              </div>
            </div>
            <div className="mt-6 flex justify-end border-t border-dashed border-[var(--line)] pt-5">
              <button className="btn-gg" onClick={nextRound} type="button">
                {roundIndex >= 5 ? "View results" : "Next round"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
