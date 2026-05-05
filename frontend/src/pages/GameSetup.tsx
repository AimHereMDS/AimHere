import { Bot, Compass, Loader2, MapPin, Navigation, Play, PlayCircle, Sparkles, Timer, User, type LucideIcon } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { ActiveGame, AiDifficulty, GameMode, GameSetup as Setup, LocationMode, MovementMode } from "../types/game";
import { apiFetch } from "../utils/api";

// ── Choice group types ───────────────────────────────────────────────────────

type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  helper: string;
  icon?: LucideIcon;
};

function activeGame(): ActiveGame | null {
  const raw = localStorage.getItem("aim-here-active-game");
  return raw ? (JSON.parse(raw) as ActiveGame) : null;
}

const locationModes: Array<ChoiceOption<LocationMode>> = [
  { value: "default", label: "Random", helper: "Anywhere with Street View coverage.", icon: Compass },
  { value: "custom", label: "Custom prompt", helper: "Describe the exact challenge style.", icon: Sparkles },
  { value: "filter", label: "Filter", helper: "Country, region, urban/rural, landmarks.", icon: MapPin },
];

// ── Predefined filter categories ────────────────────────────────────────────

type FilterChip = { label: string; emoji: string };
type FilterCategory = { name: string; chips: FilterChip[] };

const FILTER_CATEGORIES: FilterCategory[] = [
  {
    name: "Continent",
    chips: [
      { label: "Africa", emoji: "🌍" },
      { label: "Asia", emoji: "🌏" },
      { label: "Europe", emoji: "🏰" },
      { label: "North America", emoji: "🗽" },
      { label: "South America", emoji: "🌿" },
      { label: "Oceania", emoji: "🦘" },
    ],
  },
  {
    name: "Country",
    chips: [
      { label: "Romania", emoji: "🇷🇴" },
      { label: "Japan", emoji: "🇯🇵" },
      { label: "USA", emoji: "🇺🇸" },
      { label: "France", emoji: "🇫🇷" },
      { label: "Brazil", emoji: "🇧🇷" },
      { label: "Australia", emoji: "🇦🇺" },
      { label: "India", emoji: "🇮🇳" },
      { label: "Germany", emoji: "🇩🇪" },
    ],
  },
  {
    name: "Environment",
    chips: [
      { label: "Urban", emoji: "🏙️" },
      { label: "Rural", emoji: "🌾" },
      { label: "Coastal", emoji: "🏖️" },
      { label: "Mountain", emoji: "⛰️" },
    ],
  },
  {
    name: "Theme",
    chips: [
      { label: "Famous Landmarks", emoji: "🗼" },
      { label: "Historic Sites", emoji: "🏛️" },
      { label: "Natural Wonders", emoji: "🌋" },
    ],
  },
];

// ── FilterPicker component ───────────────────────────────────────────────────

function FilterPicker({ value, onChange }: { value: string; onChange: (label: string) => void }) {
  return (
    <div className="mt-3 space-y-4">
      {FILTER_CATEGORIES.map((category) => (
        <div key={category.name}>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            {category.name}
          </p>
          <div className="flex flex-wrap gap-2">
            {category.chips.map((chip) => {
              const active = value === chip.label;
              return (
                <button
                  key={chip.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange(active ? "" : chip.label)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all duration-150 ${
                    active
                      ? "border-teal-300 bg-teal-300/[0.18] text-teal-200 shadow-[0_0_0_2px_rgba(45,212,191,0.18)]"
                      : "border-white/10 bg-slate-950/40 text-slate-300 hover:border-teal-300/50 hover:bg-teal-300/[0.07] hover:text-teal-100"
                  }`}
                >
                  <span className="text-base leading-none" aria-hidden="true">{chip.emoji}</span>
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Selection status */}
      <div className="mt-1">
        {value ? (
          <div className="flex items-center gap-2 rounded-md border border-teal-300/25 bg-teal-300/[0.07] px-3 py-2 text-sm">
            <span className="text-teal-300">✓</span>
            <span className="text-slate-300">
              Curator Agent will search for{" "}
              <span className="font-bold text-teal-200">{value}</span> locations.
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Select a filter chip above to continue.</p>
        )}
      </div>
    </div>
  );
}

// ── GameSetup page ───────────────────────────────────────────────────────────

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
  const savedGame = activeGame();

  function handleLocationModeChange(newMode: LocationMode) {
    if (newMode === locationMode) return;
    setLocationMode(newMode);
    // Clear filter when switching modes to avoid stale values crossing contexts
    setFilter("");
  }

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
        {savedGame && savedGame.rounds.length < 5 && (
          <button
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-black text-amber-100 transition hover:border-amber-200/70 hover:bg-amber-300/15"
            onClick={() => navigate(`/game/${savedGame.id}`)}
            type="button"
          >
            <PlayCircle size={17} />
            Resume saved match ({savedGame.rounds.length}/5)
          </button>
        )}
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
            <ChoiceGroup columns="sm:grid-cols-3" onChange={handleLocationModeChange} options={locationModes} value={locationMode} />

            {/* Custom mode – free text input */}
            {locationMode === "custom" && (
              <div className="mt-4 panel-soft p-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-300">Describe the locations</span>
                  <input
                    className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none placeholder:text-slate-500 focus:border-teal-300"
                    maxLength={220}
                    onChange={(event) => setFilter(event.target.value)}
                    placeholder="Romania, ski towns, big cities in Asia"
                    value={filter}
                  />
                </label>
                <p className="mt-2 text-xs text-slate-400">Curator Agent will choose diverse playable coordinates and the backend snaps them toward Street View coverage.</p>
              </div>
            )}

            {/* Filter mode – chip picker (no free-text input) */}
            {locationMode === "filter" && (
              <div className="mt-4 panel-soft p-4">
                <p className="text-sm font-semibold text-slate-300">Choose a filter</p>
                <FilterPicker value={filter} onChange={setFilter} />
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

// ── Shared sub-components ────────────────────────────────────────────────────

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
