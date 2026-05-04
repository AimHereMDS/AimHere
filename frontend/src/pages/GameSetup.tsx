import { Bot, Compass, Loader2, MapPin, Navigation, Play, Sparkles, Timer, User, type LucideIcon } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { ActiveGame, AiDifficulty, GameMode, GameSetup as Setup, LocationMode, MovementMode } from "../types/game";
import { apiFetch } from "../utils/api";

type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  helper: string;
  icon?: LucideIcon;
};

const locationModes: Array<ChoiceOption<LocationMode>> = [
  { value: "default", label: "Random", helper: "Anywhere with Street View coverage.", icon: Compass },
  { value: "custom", label: "Custom prompt", helper: "Describe the exact challenge style.", icon: Sparkles },
  { value: "filter", label: "Filter", helper: "Country, region, urban/rural, landmarks.", icon: MapPin },
];

export function GameSetup() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<GameMode>("single");
  const [locationMode, setLocationMode] = useState<LocationMode>("default");
  const [filter, setFilter] = useState("");
  const [movementMode, setMovementMode] = useState<MovementMode>("limited");
  const [movementLimit, setMovementLimit] = useState(10);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState(90);
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>("medium");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (locationMode !== "default" && !filter.trim()) {
      setError("Add a location prompt or filter before starting.");
      return;
    }

    setBusy(true);
    const setup: Setup = {
      mode,
      location_mode: locationMode,
      filter_text: locationMode === "default" ? undefined : filter.trim(),
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
    <main className="app-shell mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <div className="chip mb-3">
          <Play size={14} />
          New game
        </div>
        <h1 className="text-4xl font-black uppercase tracking-tight text-white md:text-5xl">Set the rules</h1>
        <p className="mt-2 max-w-2xl text-slate-300">Five rounds, live Street View, optional hints, and an AI opponent when you want a race.</p>
      </div>

      <form className="grid gap-5 lg:grid-cols-[1fr_360px]" onSubmit={start}>
        <div className="space-y-5">
          <Section title="Game mode">
            <ChoiceGroup
              columns="sm:grid-cols-2"
              onChange={setMode}
              options={[
                { value: "single", label: "Solo", helper: "You against the map.", icon: User },
                { value: "pve", label: "Vs AI", helper: "Opponent guesses after your pin.", icon: Bot },
              ]}
              value={mode}
            />
          </Section>

          {mode === "pve" && (
            <Section title="AI difficulty">
              <ChoiceGroup
                columns="sm:grid-cols-3"
                onChange={setAiDifficulty}
                options={[
                  { value: "easy", label: "Easy", helper: "Wide mistakes." },
                  { value: "medium", label: "Medium", helper: "Balanced guesses." },
                  { value: "hard", label: "Hard", helper: "Tighter guesses." },
                ]}
                value={aiDifficulty}
              />
            </Section>
          )}

          <Section title="Locations">
            <ChoiceGroup columns="sm:grid-cols-3" onChange={setLocationMode} options={locationModes} value={locationMode} />
            {locationMode !== "default" && (
              <div className="mt-4 panel-soft p-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-300">
                    {locationMode === "custom" ? "Describe the locations" : "Filter"}
                  </span>
                  <input
                    className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none placeholder:text-slate-500 focus:border-teal-300"
                    maxLength={220}
                    onChange={(event) => setFilter(event.target.value)}
                    placeholder={locationMode === "custom" ? "Romania, ski towns, big cities in Asia" : "Japan, rural Europe, famous landmarks"}
                    value={filter}
                  />
                </label>
                <p className="mt-2 text-xs text-slate-400">Curator Agent will choose diverse playable coordinates and the backend snaps them toward Street View coverage.</p>
              </div>
            )}
          </Section>
        </div>

        <aside className="space-y-5">
          <Section title="Movement">
            <ChoiceGroup
              columns="grid-cols-1"
              onChange={setMovementMode}
              options={[
                { value: "rotation", label: "Rotation only", helper: "Look around without moving.", icon: Navigation },
                { value: "limited", label: "Limited", helper: `Up to ${movementLimit} panoramas.`, icon: MapPin },
                { value: "full", label: "Full movement", helper: "Roam freely.", icon: Compass },
              ]}
              value={movementMode}
            />
            {movementMode === "limited" && (
              <label className="mt-4 block panel-soft p-4">
                <span className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-300">
                  Max panoramas
                  <span className="font-black text-teal-300">{movementLimit}</span>
                </span>
                <input
                  className="w-full accent-teal-400"
                  max={30}
                  min={3}
                  onChange={(event) => setMovementLimit(Number(event.target.value))}
                  type="range"
                  value={movementLimit}
                />
              </label>
            )}
          </Section>

          <Section title="Timer">
            <div className="panel-soft p-4">
              <label className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-semibold text-white">
                  <Timer size={18} />
                  Round timer
                </span>
                <input checked={timerEnabled} className="h-5 w-5 accent-teal-400" onChange={(event) => setTimerEnabled(event.target.checked)} type="checkbox" />
              </label>
              {timerEnabled && (
                <label className="mt-4 block">
                  <span className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-300">
                    Seconds per round
                    <span className="font-black text-teal-300">{timerSeconds}s</span>
                  </span>
                  <input
                    className="w-full accent-teal-400"
                    max={300}
                    min={30}
                    onChange={(event) => setTimerSeconds(Number(event.target.value))}
                    step={15}
                    type="range"
                    value={timerSeconds}
                  />
                </label>
              )}
            </div>
          </Section>

          <button className="btn-gg w-full disabled:translate-y-0 disabled:opacity-60" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" size={19} /> : <Play size={19} strokeWidth={3} />}
            {busy ? "Loading panoramas..." : "Start 5 rounds"}
          </button>
          {error && <p className="rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        </aside>
      </form>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel p-5">
      <h2 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-teal-300">{title}</h2>
      {children}
    </section>
  );
}

function ChoiceGroup<T extends string>({
  value,
  onChange,
  options,
  columns,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<ChoiceOption<T>>;
  columns: string;
}) {
  return (
    <div className={`grid gap-3 ${columns}`}>
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            className={`rounded-lg border p-4 text-left transition ${
              active
                ? "border-teal-300 bg-teal-300/[0.12] shadow-[0_0_0_3px_rgba(45,212,191,0.12)]"
                : "border-white/10 bg-slate-950/35 hover:border-teal-300/45"
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <div className="mb-1 flex items-center gap-2">
              {Icon && <Icon className={active ? "text-teal-300" : "text-slate-400"} size={17} />}
              <div className="text-sm font-black uppercase tracking-tight text-white">{option.label}</div>
            </div>
            <div className="text-xs leading-5 text-slate-400">{option.helper}</div>
          </button>
        );
      })}
    </div>
  );
}
