import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { AtlasStat, MiniWorldMap } from "../components/Atlas/Atlas";
import type { Profile as ProfileType } from "../types/game";
import { apiFetch } from "../utils/api";

export function Profile() {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<ProfileType>("/auth/me").then(setProfile).catch((err) => setError(err instanceof Error ? err.message : "Could not load profile"));
  }, []);

  if (error) return <main className="app-shell p-8 text-[var(--neg)]">{error}</main>;
  if (!profile) return <main className="app-shell p-8 text-[var(--ink-3)]">Loading profile...</main>;

  return (
    <main className="app-shell">
      <div className="atlas-page atlas-page-narrow">
        <section className="surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="serif flex h-20 w-20 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--accent),transparent_65%)] bg-[var(--accent-soft)] text-4xl text-[var(--accent)]">
                {(profile.display_name || profile.email).slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="eyebrow">Explorer profile</div>
                <h1 className="serif mt-1 text-5xl leading-none text-[var(--ink)]">{profile.display_name || "Player"}</h1>
                <p className="mono mt-2 text-sm text-[var(--ink-3)]">{profile.email}</p>
              </div>
            </div>
            <Link className="btn-gg" to="/setup">
              <Play size={17} />
              New match
            </Link>
          </div>
        </section>

        <section className="mt-7 grid items-start gap-7 lg:grid-cols-[1fr_360px]">
          <div className="surface p-5">
            <div className="eyebrow">Career stat sheet</div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <AtlasStat label="Games played" size="lg" value={profile.games_played.toLocaleString()} />
              <AtlasStat label="Average" size="lg" value={Math.round(profile.average_score).toLocaleString()} />
              <AtlasStat label="Best match" size="lg" value={profile.best_score.toLocaleString()} />
              <AtlasStat label="Current streak" size="lg" value={profile.current_streak.toLocaleString()} />
              <AtlasStat label="Best streak" size="lg" value={profile.best_streak.toLocaleString()} />
              <AtlasStat label="Total score" size="lg" value={profile.total_score.toLocaleString()} />
            </div>
          </div>

          <aside className="space-y-7">
            <div className="surface overflow-hidden p-5">
              <div className="eyebrow">World coverage</div>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-3)]">
                Places guessed near enough to leave a mark in the field atlas.
              </p>
              <div className="mt-4 h-56 rounded-md border border-[var(--line)] bg-[var(--bg-inset)]">
                <MiniWorldMap
                  pins={[
                    { x: 220, y: 130 },
                    { x: 480, y: 100 },
                    { x: 540, y: 200 },
                    { x: 680, y: 130 },
                    { x: 720, y: 220 },
                    { x: 820, y: 320 },
                  ].map((pin) => ({ ...pin, color: "var(--accent)" }))}
                />
              </div>
              <div className="mono mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.1em] text-[var(--ink-3)]">
                <span>{profile.games_played} routes</span>
                <span>·</span>
                <span>{profile.total_score.toLocaleString()} pts</span>
              </div>
            </div>

            <div className="surface p-5">
              <div className="eyebrow">Badges</div>
              <div className="mt-4 space-y-2">
                <Badge earned={profile.games_played > 0} label="First fix" sub="Complete a match" />
                <Badge earned={profile.best_score >= 20000} label="Cartographer" sub="Score over 20,000" />
                <Badge earned={profile.current_streak > 1} label="Streak line" sub="Win several routes in a row" />
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Badge({ label, sub, earned }: { label: string; sub: string; earned: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-md border p-3 ${earned ? "border-[var(--line)] bg-[var(--bg-inset)]" : "border-[var(--line-soft)] bg-transparent opacity-55"}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${earned ? "bg-[var(--accent)]" : "bg-[var(--ink-4)]"}`} />
      <span className="min-w-0">
        <span className="serif block text-lg leading-tight text-[var(--ink)]">{label}</span>
        <span className="block text-xs text-[var(--ink-3)]">{sub}</span>
      </span>
    </div>
  );
}
