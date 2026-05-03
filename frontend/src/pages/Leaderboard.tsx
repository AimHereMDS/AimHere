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

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold text-ink">Global leaderboard</h1>
      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Best</th>
              <th className="px-4 py-3">Average</th>
              <th className="px-4 py-3">Games</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr className="border-t border-slate-100" key={entry.user_id}>
                <td className="px-4 py-3 font-semibold">{entry.rank}</td>
                <td className="px-4 py-3">{entry.display_name || "Player"}</td>
                <td className="px-4 py-3">{entry.best_score.toLocaleString()}</td>
                <td className="px-4 py-3">{Math.round(entry.average_score).toLocaleString()}</td>
                <td className="px-4 py-3">{entry.games_played}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!entries.length && <div className="p-6 text-slate-500">{error || "No completed games yet."}</div>}
      </div>
    </main>
  );
}

