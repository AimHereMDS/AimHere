import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";

import { apiFetch } from "../utils/api";

type Entry = {
  rank: number;
  user_id: string;
  display_name?: string | null;
  total_score: number;
  best_score: number;
  games_played: number;
  average_score: number;
};

export function Leaderboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<Entry[]>("/leaderboard").then(setEntries).catch((err) => setError(err instanceof Error ? err.message : "Could not load leaderboard"));
  }, []);

  const podium = entries.slice(0, 3);

  return (
    <main className="app-shell">
      <div className="atlas-page atlas-page-narrow">
        <div className="mb-8">
          <span className="chip chip-accent">
            <Trophy size={13} />
            Rankings
          </span>
          <h1 className="serif atlas-title mt-4">The global table.</h1>
          <p className="atlas-copy mt-4 max-w-2xl">
            Best single match, average score, and completed routes. Updated whenever games finish.
          </p>
        </div>

        {podium.length > 0 && (
          <div className="mb-7 grid gap-4 md:grid-cols-3">
            {podium.map((entry) => (
              <div className="surface p-5 text-center" key={entry.user_id}>
                <div className="mono text-xs uppercase tracking-[0.18em] text-[var(--accent)]">#{String(entry.rank).padStart(2, "0")}</div>
                <div className="serif mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--accent-soft)] text-3xl text-[var(--accent)]">
                  {(entry.display_name || "Player").slice(0, 1).toUpperCase()}
                </div>
                <div className="serif mt-4 truncate text-2xl text-[var(--ink)]">{entry.display_name || "Player"}</div>
                <div className="mt-4 border-y border-[var(--line)] py-4">
                  <div className="serif text-4xl text-[var(--ink)]">{entry.best_score.toLocaleString()}</div>
                  <div className="eyebrow mt-1">best score</div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="eyebrow">Avg</div>
                    <div className="mono mt-1 text-[var(--ink)]">{Math.round(entry.average_score).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="eyebrow">Games</div>
                    <div className="mono mt-1 text-[var(--ink)]">{entry.games_played}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="surface overflow-hidden">
          <div className="grid grid-cols-[70px_1fr_120px_120px_90px] gap-3 border-b border-[var(--line)] bg-[var(--bg-inset)] px-4 py-3 text-left text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)] max-md:hidden">
            <span className="mono">Rank</span>
            <span className="mono">Player</span>
            <span className="mono text-right">Best</span>
            <span className="mono text-right">Average</span>
            <span className="mono text-right">Games</span>
          </div>
          <div>
            {entries.map((entry) => (
              <div
                className="grid grid-cols-[70px_1fr_120px_120px_90px] items-center gap-3 border-b border-[var(--line-soft)] px-4 py-3 text-sm last:border-b-0 max-md:grid-cols-[52px_1fr] max-md:gap-y-2"
                key={entry.user_id}
              >
                <span className="serif text-2xl text-[var(--ink)]">{entry.rank}</span>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--bg-inset)] text-sm text-[var(--accent)]">
                    {(entry.display_name || "P").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[var(--ink)]">{entry.display_name || "Player"}</span>
                    <span className="mono block text-[10px] uppercase tracking-[0.1em] text-[var(--ink-4)]">Explorer</span>
                  </span>
                </span>
                <span className="mono text-right text-[var(--ink)] max-md:col-start-2 max-md:text-left">Best {entry.best_score.toLocaleString()}</span>
                <span className="mono text-right text-[var(--ink-2)] max-md:col-start-2 max-md:text-left">Avg {Math.round(entry.average_score).toLocaleString()}</span>
                <span className="mono text-right text-[var(--ink-2)] max-md:col-start-2 max-md:text-left">{entry.games_played} games</span>
              </div>
            ))}
          </div>
          {!entries.length && <div className="p-6 text-[var(--ink-3)]">{error || "No completed games yet."}</div>}
        </div>
      </div>
    </main>
  );
}
