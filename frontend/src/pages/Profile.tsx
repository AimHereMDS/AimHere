import { Award, MapPinned, Play, Route, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { AtlasStat } from "../components/Atlas/Atlas";
import { getCoverageSummary, WorldCoverageMap } from "../components/Atlas/WorldCoverageMap";
import type { Achievement, CareerStats, Profile as ProfileType } from "../types/game";
import { apiFetch } from "../utils/api";

const EMPTY_CAREER_STATS: CareerStats = {
  rounds_played: 0,
  best_round_score: 0,
  average_round_score: 0,
  average_distance_km: null,
  closest_guess_km: null,
  sub_1km_guesses: 0,
  sub_10km_guesses: 0,
  near_perfect_rounds: 0,
  hints_used: 0,
  average_hints_per_game: 0,
  no_hint_games: 0,
  pve_wins: 0,
  pve_losses: 0,
  pve_draws: 0,
};

export function Profile() {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<ProfileType>("/auth/me").then(setProfile).catch((err) => setError(err instanceof Error ? err.message : "Could not load profile"));
  }, []);

  const stats = profile?.career_stats ?? EMPTY_CAREER_STATS;
  const coveragePoints = profile?.world_coverage?.points ?? [];
  const coverage = useMemo(() => getCoverageSummary(coveragePoints), [coveragePoints]);
  const achievements = useMemo(
    () => (profile ? buildAchievements(profile, stats, coverage.countries.length, coverage.continents.length) : []),
    [profile, stats, coverage.countries.length, coverage.continents.length],
  );
  const earnedAchievements = achievements.filter((achievement) => achievement.earned).length;

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

        <section className="mt-7 grid items-start gap-7 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="surface overflow-hidden p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="eyebrow">World coverage</div>
                <h2 className="serif mt-2 text-3xl leading-tight text-[var(--ink)]">Countries and continents logged</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-3)]">
                  Finished rounds are plotted from the real coordinates stored on your matches.
                </p>
              </div>
              <span className="chip chip-accent">
                <MapPinned size={13} />
                {coveragePoints.length.toLocaleString()} pins
              </span>
            </div>

            <div className="world-coverage-frame mt-5">
              <WorldCoverageMap points={coveragePoints} />
              {coveragePoints.length === 0 && (
                <div className="world-coverage-empty">
                  <Route size={18} />
                  <span>Finish a match to mark the atlas.</span>
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniPanel label="Countries" value={coverage.countries.length.toLocaleString()} />
              <MiniPanel label="Continents" value={coverage.continents.length.toLocaleString()} />
              <MiniPanel label="Coverage score" value={(profile.world_coverage?.total_score ?? 0).toLocaleString()} />
            </div>

            {coverage.countries.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {coverage.countries.slice(0, 10).map((country) => (
                  <span className="coverage-chip" key={country.id}>{country.name}</span>
                ))}
                {coverage.countries.length > 10 && <span className="coverage-chip">+{coverage.countries.length - 10} more</span>}
              </div>
            )}
          </div>

          <div className="surface p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="eyebrow">Career stat sheet</div>
                <h2 className="serif mt-2 text-3xl leading-tight text-[var(--ink)]">Run log</h2>
              </div>
              <Trophy className="text-[var(--accent)]" size={22} />
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <AtlasStat label="Games played" size="lg" value={profile.games_played.toLocaleString()} />
              <AtlasStat label="Average" size="lg" value={Math.round(profile.average_score).toLocaleString()} />
              <AtlasStat label="Best match" size="lg" value={profile.best_score.toLocaleString()} />
              <AtlasStat label="Total score" size="lg" value={profile.total_score.toLocaleString()} />
            </div>
            <div className="career-detail-grid mt-5">
              <DetailStat label="Rounds played" value={stats.rounds_played.toLocaleString()} />
              <DetailStat label="Best round" value={stats.best_round_score.toLocaleString()} />
              <DetailStat label="Avg round" value={Math.round(stats.average_round_score).toLocaleString()} />
              <DetailStat label="Avg distance" value={formatKm(stats.average_distance_km)} />
              <DetailStat label="Closest guess" value={formatKm(stats.closest_guess_km)} />
              <DetailStat label="Sub-1km guesses" value={stats.sub_1km_guesses.toLocaleString()} />
              <DetailStat label="Near-perfect rounds" value={stats.near_perfect_rounds.toLocaleString()} />
              <DetailStat label="Hints used" value={stats.hints_used.toLocaleString()} />
              <DetailStat label="No-hint games" value={stats.no_hint_games.toLocaleString()} />
              <DetailStat label="PvE record" value={`${stats.pve_wins}-${stats.pve_losses}-${stats.pve_draws}`} />
              <DetailStat label="Current streak" value={profile.current_streak.toLocaleString()} />
              <DetailStat label="Best streak" value={profile.best_streak.toLocaleString()} />
            </div>
          </div>
        </section>

        <section className="surface mt-7 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="eyebrow">Achievements</div>
              <h2 className="serif mt-2 text-3xl leading-tight text-[var(--ink)]">Explorer medals</h2>
            </div>
            <span className="chip">
              <Award size={13} />
              {earnedAchievements}/{achievements.length} earned
            </span>
          </div>
          <div className="achievement-grid mt-5">
            {achievements.map((achievement) => (
              <AchievementCard achievement={achievement} key={achievement.id} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function buildAchievements(
  profile: ProfileType,
  stats: CareerStats,
  countriesPlayed: number,
  continentsPlayed: number,
) {
  const baseAchievements = profile.achievements ?? [];
  const geoAchievements: Achievement[] = [
    {
      id: "world-traveler",
      title: "World Traveler",
      description: "Play finished rounds on three continents.",
      earned: continentsPlayed >= 3,
      progress: Math.min(continentsPlayed, 3),
      goal: 3,
      category: "Coverage",
    },
    {
      id: "globe-trotter",
      title: "Globe Trotter",
      description: "Reach five continents in your atlas.",
      earned: continentsPlayed >= 5,
      progress: Math.min(continentsPlayed, 5),
      goal: 5,
      category: "Coverage",
    },
    {
      id: "country-collector",
      title: "Country Collector",
      description: "Log finished rounds in ten countries.",
      earned: countriesPlayed >= 10,
      progress: Math.min(countriesPlayed, 10),
      goal: 10,
      category: "Coverage",
    },
    {
      id: "continental-sweep",
      title: "Continental Sweep",
      description: "Reach all six mapped continents.",
      earned: continentsPlayed >= 6,
      progress: Math.min(continentsPlayed, 6),
      goal: 6,
      category: "Coverage",
    },
    {
      id: "border-scholar",
      title: "Border Scholar",
      description: "Log finished rounds in twenty-five countries.",
      earned: countriesPlayed >= 25,
      progress: Math.min(countriesPlayed, 25),
      goal: 25,
      category: "Coverage",
    },
    {
      id: "world-ledger",
      title: "World Ledger",
      description: "Mark fifty countries in your atlas.",
      earned: countriesPlayed >= 50,
      progress: Math.min(countriesPlayed, 50),
      goal: 50,
      category: "Legendary",
    },
    {
      id: "atlas-archive",
      title: "Atlas Archive",
      description: "Mark one hundred countries in your atlas.",
      earned: countriesPlayed >= 100,
      progress: Math.min(countriesPlayed, 100),
      goal: 100,
      category: "Legendary",
    },
    {
      id: "whole-earth-file",
      title: "Whole Earth File",
      description: "Mark one hundred and fifty countries.",
      earned: countriesPlayed >= 150,
      progress: Math.min(countriesPlayed, 150),
      goal: 150,
      category: "Legendary",
    },
    {
      id: "atlas-scout",
      title: "Atlas Scout",
      description: "Complete twenty-five scored rounds.",
      earned: stats.rounds_played >= 25,
      progress: Math.min(stats.rounds_played, 25),
      goal: 25,
      category: "Volume",
    },
  ];
  const byId = new Map<string, Achievement>();
  [...baseAchievements, ...geoAchievements].forEach((achievement) => byId.set(achievement.id, achievement));
  return Array.from(byId.values()).sort((a, b) => Number(b.earned) - Number(a.earned) || a.category.localeCompare(b.category));
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const percent = achievement.goal > 0 ? Math.min(100, Math.round((achievement.progress / achievement.goal) * 100)) : 0;
  return (
    <article className={achievement.earned ? "achievement-card is-earned" : "achievement-card"}>
      <div className="flex items-start justify-between gap-3">
        <span className="achievement-mark">
          <Award size={16} />
        </span>
        <span className="mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-4)]">{achievement.category}</span>
      </div>
      <h3 className="serif mt-4 text-xl leading-tight text-[var(--ink)]">{achievement.title}</h3>
      <p className="mt-2 text-xs leading-5 text-[var(--ink-3)]">{achievement.description}</p>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-[var(--ink-3)]">
          <span>{achievement.earned ? "Earned" : "In progress"}</span>
          <span className="mono">{formatProgress(achievement)}</span>
        </div>
        <div className="achievement-progress">
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>
    </article>
  );
}

function MiniPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-panel">
      <div className="eyebrow">{label}</div>
      <div className="mono mt-1 text-xl text-[var(--ink)]">{value}</div>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="career-detail">
      <div className="mono text-lg text-[var(--ink)]">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-[0.11em] text-[var(--ink-3)]">{label}</div>
    </div>
  );
}

function formatKm(value?: number | null) {
  if (value === null || value === undefined) return "-";
  if (value < 1) return `${Math.round(value * 1000)} m`;
  if (value < 10) return `${value.toFixed(1)} km`;
  return `${Math.round(value).toLocaleString()} km`;
}

function formatProgress(achievement: Achievement) {
  const progress = Math.floor(achievement.progress).toLocaleString();
  const goal = Math.floor(achievement.goal).toLocaleString();
  return `${progress}/${goal}`;
}
