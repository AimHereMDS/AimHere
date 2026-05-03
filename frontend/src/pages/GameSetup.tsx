import { Play } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { ActiveGame, AiDifficulty, GameMode, GameSetup as Setup, LocationMode, MovementMode } from "../types/game";
import { apiFetch } from "../utils/api";

const locationModes: Array<{ value: LocationMode; label: string; helper: string }> = [
  { value: "default", label: "World random", helper: "Runtime random coordinates with Street View coverage." },
  { value: "custom", label: "Custom prompt", helper: "Describe anything playable: Romania, ski towns, desert highways." },
  { value: "country", label: "Country", helper: "Type a country name." },
  { value: "continent", label: "Continent", helper: "Type a continent or region." },
  { value: "urban", label: "Urban", helper: "Large cities and dense streets." },
  { value: "rural", label: "Rural", helper: "Roads outside dense cities." },
  { value: "famous", label: "Famous locations", helper: "Landmarks and recognizable places." },
];

export function GameSetup() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<GameMode>("single");
  const [locationMode, setLocationMode] = useState<LocationMode>("default");
  const [filter, setFilter] = useState("");
  const [movementMode, setMovementMode] = useState<MovementMode>("rotation");
  const [movementLimit, setMovementLimit] = useState(5);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(180);
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>("medium");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const setup: Setup = {
      mode,
      location_mode: locationMode,
      filter_text:
        locationMode === "default"
          ? undefined
          : locationMode === "custom"
            ? filter
            : `${locationMode}: ${filter || locationMode}`,
      movement_mode: movementMode,
      movement_limit: movementLimit,
      timer_seconds: timerEnabled ? timerSeconds : null,
      ai_difficulty: aiDifficulty,
    };
    try {
      const response = await apiFetch<{ id: string; mode: GameMode; locations: ActiveGame["locations"] }>("/games", {
        method: "POST",
        body: JSON.stringify(setup),
      });
      const activeGame: ActiveGame = { id: response.id, mode: response.mode, setup, locations: response.locations, rounds: [] };
      localStorage.setItem("aim-here-active-game", JSON.stringify(activeGame));
      navigate(`/game/${response.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start game");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ink">Game setup</h1>
        <p className="mt-2 text-slate-600">Choose the match type, location source, movement rules, and timer.</p>
      </div>
      <form className="grid gap-5 lg:grid-cols-[1fr_360px]" onSubmit={start}>
        <div className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-ink">Match mode</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["single", "pve"] as GameMode[]).map((item) => (
                <button
                  className={`rounded-md border p-4 text-left ${mode === item ? "border-field bg-teal-50" : "border-slate-200"}`}
                  key={item}
                  onClick={() => setMode(item)}
                  type="button"
                >
                  <div className="font-semibold capitalize">{item === "pve" ? "PvE AI opponent" : "Single player"}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {item === "pve" ? "AI guesses after you place your pin." : "Five rounds against the map."}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-ink">Location source</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {locationModes.map((item) => (
                <button
                  className={`rounded-md border p-4 text-left ${locationMode === item.value ? "border-field bg-teal-50" : "border-slate-200"}`}
                  key={item.value}
                  onClick={() => setLocationMode(item.value)}
                  type="button"
                >
                  <div className="font-semibold">{item.label}</div>
                  <div className="mt-1 text-sm text-slate-500">{item.helper}</div>
                </button>
              ))}
            </div>
            {locationMode !== "default" && (
              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Filter text</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-field"
                  onChange={(event) => setFilter(event.target.value)}
                  placeholder="Romania, famous landmarks, big cities in Asia"
                  value={filter}
                />
              </label>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-ink">Movement</h2>
            <div className="space-y-2">
              {(["rotation", "limited", "full"] as MovementMode[]).map((item) => (
                <label className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2" key={item}>
                  <input checked={movementMode === item} onChange={() => setMovementMode(item)} type="radio" />
                  <span className="capitalize">{item === "full" ? "Full movement" : item.replace("-", " ")}</span>
                </label>
              ))}
            </div>
            {movementMode === "limited" && (
              <label className="mt-3 block">
                <span className="mb-1 block text-sm text-slate-600">Max panoramas away</span>
                <input
                  className="w-full"
                  max={25}
                  min={1}
                  onChange={(event) => setMovementLimit(Number(event.target.value))}
                  type="range"
                  value={movementLimit}
                />
                <span className="text-sm font-semibold">{movementLimit}</span>
              </label>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-ink">Timer and AI</h2>
            <label className="flex items-center justify-between gap-3">
              <span>Countdown timer</span>
              <input checked={timerEnabled} onChange={(event) => setTimerEnabled(event.target.checked)} type="checkbox" />
            </label>
            {timerEnabled && (
              <input
                className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2"
                max={900}
                min={15}
                onChange={(event) => setTimerSeconds(Number(event.target.value))}
                type="number"
                value={timerSeconds}
              />
            )}
            {mode === "pve" && (
              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-medium text-slate-700">AI difficulty</span>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                  onChange={(event) => setAiDifficulty(event.target.value as AiDifficulty)}
                  value={aiDifficulty}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
            )}
          </section>
          <button className="flex w-full items-center justify-center gap-2 rounded-md bg-field px-5 py-3 font-semibold text-white disabled:opacity-60" disabled={busy}>
            <Play size={18} />
            {busy ? "Preparing panoramas..." : "Start 5 rounds"}
          </button>
          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </aside>
      </form>
    </main>
  );
}

