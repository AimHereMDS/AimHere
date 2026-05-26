import { Bot, Compass, Loader2, MapPin, Navigation, Play, PlayCircle, Sparkles, Timer, User, type LucideIcon } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { AtlasStat, MiniWorldMap } from "../components/Atlas/Atlas";
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
          <p className="atlas-label mb-2">
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
                  className={`filter-chip ${
                    active
                      ? "is-active"
                      : ""
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
          <div className="flex items-center gap-2 rounded-md border border-[color-mix(in_oklab,var(--accent),transparent_72%)] bg-[var(--accent-soft)] px-3 py-2 text-sm">
            <span className="text-[var(--accent)]">✓</span>
            <span className="text-[var(--ink-2)]">
              Curator Agent will search for{" "}
              <span className="font-bold text-[var(--accent)]">{value}</span> locations.
            </span>
          </div>
        ) : (
          <p className="text-xs text-[var(--ink-4)]">Select a filter chip above to continue.</p>
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
    <main className="app-shell">
      <div className="atlas-page atlas-page-narrow">
      <div className="mb-8 max-w-3xl">
        <div className="chip chip-accent mb-4">
          <Play size={14} />
          New game
        </div>
        <h1 className="serif atlas-title">Set the rules.</h1>
        <p className="atlas-copy mt-4 max-w-2xl">Five rounds, live Street View, optional hints, and an AI opponent when you want a race.</p>
        {savedGame && savedGame.rounds.length < 5 && (
          <button
            className="mt-5 inline-flex items-center gap-3 rounded-full border border-[color-mix(in_oklab,var(--accent),transparent_60%)] bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:bg-[color-mix(in_oklab,var(--accent),transparent_80%)]"
            onClick={() => navigate(`/game/${savedGame.id}`)}
            type="button"
          >
            <PlayCircle size={17} />
            Resume saved match ({savedGame.rounds.length}/5)
          </button>
        )}
      </div>

      <form className="grid items-start gap-7 lg:grid-cols-[1fr_360px]" onSubmit={start}>
        <div className="space-y-7">
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
              <div className="surface mt-4 p-4">
                <label className="block">
                  <span className="atlas-label">Describe the locations</span>
                  <input
                    className="atlas-input"
                    maxLength={220}
                    onChange={(event) => setFilter(event.target.value)}
                    placeholder="Romania, ski towns, big cities in Asia"
                    value={filter}
                  />
                </label>
                <p className="mt-2 text-xs text-[var(--ink-3)]">Curator Agent will choose diverse playable coordinates and the backend snaps them toward Street View coverage.</p>
              </div>
            )}

            {/* Filter mode – chip picker (no free-text input) */}
            {locationMode === "filter" && (
              <div className="surface mt-4 p-4">
                <p className="text-sm font-semibold text-[var(--ink-2)]">Choose a filter</p>
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
              <label className="surface mt-4 block p-4">
                <span className="mb-2 flex items-center justify-between text-sm font-semibold text-[var(--ink-2)]">
                  Max panoramas
                  <span className="mono font-semibold text-[var(--accent)]">{movementLimit}</span>
                </span>
                <input
                  className="slider"
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
            <div className="surface p-4">
              <label className="flex items-center justify-between gap-3">
                <span className="serif flex items-center gap-2 text-lg text-[var(--ink)]">
                  <Timer size={18} />
                  Round timer
                </span>
                <input checked={timerEnabled} className="h-5 w-5 accent-[var(--accent)]" onChange={(event) => setTimerEnabled(event.target.checked)} type="checkbox" />
              </label>
              {timerEnabled && (
                <label className="mt-4 block">
                  <span className="mb-2 flex items-center justify-between text-sm font-semibold text-[var(--ink-2)]">
                    Seconds per round
                    <span className="mono font-semibold text-[var(--accent)]">{timerSeconds}s</span>
                  </span>
                  <input
                    className="slider"
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

          <div className="surface p-5">
            <div className="mb-4 flex items-center justify-between border-b border-dashed border-[var(--line)] pb-3">
              <span className="eyebrow">Match summary</span>
              <span className="mono text-xs text-[var(--ink-3)]">5 rounds · {timerEnabled ? `${timerSeconds}s` : "no timer"}</span>
            </div>
            <div className="space-y-2 text-sm">
              <SummaryRow k="MODE" v={mode === "pve" ? `Vs AI · ${aiDifficulty}` : "Solo"} />
              <SummaryRow k="LOCATIONS" v={locationMode === "default" ? "Random global" : locationMode === "custom" ? "Custom prompt" : filter || "Filter"} />
              <SummaryRow k="MOVEMENT" v={movementMode === "limited" ? `Limited · ${movementLimit} panos` : movementMode === "rotation" ? "Rotation only" : "Full movement"} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <AtlasStat label="Rounds" size="sm" value="5" />
              <AtlasStat label="Max score" size="sm" value="25K" />
            </div>
            <div className="mt-4 h-36 overflow-hidden rounded-md border border-[var(--line)] bg-[var(--bg-inset)]">
              <MiniWorldMap pins={[{ x: 480, y: 100, color: "var(--accent)" }, { x: 545, y: 205, color: "var(--accent)" }, { x: 820, y: 320, color: "var(--accent)" }]} />
            </div>
          </div>

          <button className="btn-gg w-full disabled:translate-y-0 disabled:opacity-60" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" size={19} /> : <Play size={19} strokeWidth={3} />}
            {busy ? "Loading panoramas..." : "Start 5 rounds"}
          </button>
          {error && <p className="rounded-md border border-[color-mix(in_oklab,var(--neg),transparent_50%)] bg-[var(--neg-soft)] p-3 text-sm text-[var(--ink)]">{error}</p>}
        </aside>
      </form>
      </div>
    </main>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="h-px w-8 bg-[var(--line-strong)]" />
        <h2 className="serif atlas-section-title">{title}</h2>
      </div>
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
            className={`atlas-selector ${active ? "is-active" : ""}`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <span className="atlas-selector-icon">
              {Icon && <Icon size={18} />}
            </span>
            <div>
              <span className="atlas-selector-title">{option.label}</span>
              <span className="atlas-selector-sub">{option.helper}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="mono min-w-20 text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]">{k}</span>
      <span className="h-px flex-1 bg-[repeating-linear-gradient(to_right,var(--line)_0_3px,transparent_3px_6px)]" />
      <span className="text-right text-[var(--ink)]">{v}</span>
    </div>
  );
}
