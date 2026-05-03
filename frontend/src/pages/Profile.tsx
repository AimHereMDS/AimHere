import { useEffect, useState } from "react";

import type { Profile as ProfileType } from "../types/game";
import { apiFetch } from "../utils/api";

export function Profile() {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<ProfileType>("/auth/me").then(setProfile).catch((err) => setError(err instanceof Error ? err.message : "Could not load profile"));
  }, []);

  if (error) return <main className="p-8 text-red-700">{error}</main>;
  if (!profile) return <main className="p-8 text-slate-600">Loading profile...</main>;

  const stats = [
    ["Games played", profile.games_played],
    ["Average score", Math.round(profile.average_score)],
    ["Best score", profile.best_score],
    ["Current streak", profile.current_streak],
    ["Best streak", profile.best_streak],
    ["Total score", profile.total_score],
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-md bg-field text-2xl font-bold text-white">
            {(profile.display_name || profile.email).slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-ink">{profile.display_name || "Player"}</h1>
            <p className="text-slate-500">{profile.email}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map(([label, value]) => (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={label}>
              <div className="text-sm font-semibold text-slate-500">{label}</div>
              <div className="mt-2 text-2xl font-bold text-ink">{Number(value).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

