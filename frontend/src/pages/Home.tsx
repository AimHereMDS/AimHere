import { Bot, Brain, Globe2, MapPinned, PlayCircle, RotateCcw, Settings2, Target, Trophy } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { AtlasStat, CompassRose } from "../components/Atlas/Atlas";
import { getCoverageSummary, SAMPLE_COVERAGE_POINTS, WorldCoverageMap } from "../components/Atlas/WorldCoverageMap";
import { AuthCard } from "../components/Auth/AuthCard";
import { useAuth } from "../hooks/useAuth";
import type { ActiveGame } from "../types/game";

function activeGame(): ActiveGame | null {
  const raw = localStorage.getItem("aim-here-active-game");
  return raw ? (JSON.parse(raw) as ActiveGame) : null;
}

export function Home() {
  const { user } = useAuth();
  const savedGame = user ? activeGame() : null;
  const userCoveragePoints = user?.world_coverage?.points ?? [];
  const homeMapPoints = userCoveragePoints.length > 0 ? userCoveragePoints : SAMPLE_COVERAGE_POINTS;
  const userCoverage = useMemo(() => getCoverageSummary(userCoveragePoints), [userCoveragePoints]);

  return (
    <main className="app-shell">
      <div className="atlas-page">
        <section className="grid items-start gap-14 pt-8 lg:grid-cols-[1.12fr_0.88fr]">
          <div>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="eyebrow">Logged on · Earth route active</span>
              <span className="hidden h-px w-9 bg-[var(--line-strong)] sm:block" />
              <span className="eyebrow">5 rounds · live street view · AI rival</span>
            </div>

            <h1 className="serif atlas-hero-title">
              Drop in.
              <br />
              Read the world.
              <br />
              <em>Outguess the AI.</em>
            </h1>

            <p className="atlas-copy mt-6 max-w-xl">
              A geographic guessing game played on the real planet. Five panoramas, five pins, and an
              optional AI rival trying to read the same streets, signs, roads, and landscapes.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="btn-gg" to={user ? "/setup" : "/#auth"}>
                <MapPinned size={18} />
                {savedGame ? "Resume match" : "Start a match"}
              </Link>
              <Link className="btn-secondary" to="/leaderboard">
                <Trophy size={18} />
                Leaderboard
              </Link>
            </div>

            {user && savedGame && savedGame.rounds.length < 5 && (
              <Link className="surface mt-7 flex max-w-xl items-center gap-4 p-4" to={`/game/${savedGame.id}`}>
                <span className="chip chip-accent">
                  <RotateCcw size={12} />
                  Saved match
                </span>
                <span className="min-w-0 flex-1">
                  <span className="serif block text-lg leading-tight text-[var(--ink)]">
                    Round {savedGame.rounds.length + 1} of 5
                  </span>
                  <span className="mono block text-xs tracking-[0.08em] text-[var(--ink-3)]">
                    {savedGame.mode === "pve" ? "PvE route" : "Solo route"} · resume field log
                  </span>
                </span>
                <PlayCircle className="text-[var(--accent)]" size={19} />
              </Link>
            )}

            <div className="mt-9 grid max-w-2xl grid-cols-2 gap-6 border-t border-[var(--line)] pt-6 md:grid-cols-4">
              <AtlasStat label="Rounds per match" value="5" />
              <AtlasStat label="Max score" value="25K" />
              <AtlasStat hint="curator · hint · rival" label="AI agents" value="3" />
              <AtlasStat hint="real Street View" label="Locations" value="∞" />
            </div>
          </div>

          <div className="flex flex-col gap-6" id="auth">
            <div className="atlas-home-globe">
              <div className="atlas-home-globe-grid" />
              <div className="atlas-home-globe-inner">
                <CompassRose size={220} spin />
              </div>
              <div className="absolute bottom-5 left-5 flex flex-col gap-1 text-[10px] uppercase tracking-[0.13em] text-[var(--ink-3)]">
                <span className="mono">LAT 48.8566</span>
                <span className="mono">LON 2.3522</span>
                <span className="mono">RES +/- 2.4m</span>
              </div>
              <span className="atlas-home-pin left-[28%] top-[32%]" />
              <span className="atlas-home-pin left-[62%] top-[58%] [animation-delay:0.8s]" />
              <span className="atlas-home-pin left-[70%] top-[22%] [animation-delay:1.6s]" />
            </div>

            {user ? (
              <div className="surface p-5">
                <div className="flex items-center gap-3 border-b border-dashed border-[var(--line)] pb-4">
                  <div className="serif flex h-11 w-11 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--accent),transparent_65%)] bg-[var(--accent-soft)] text-2xl text-[var(--accent)]">
                    {user.email.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="eyebrow">Signed in</div>
                    <div className="serif truncate text-lg text-[var(--ink)]">{user.email.split("@")[0]}</div>
                  </div>
                  <Link className="btn-secondary btn-sm ml-auto" to="/profile">
                    Profile
                  </Link>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-3">
                  <MiniStat label="Best" value={user.best_score.toLocaleString()} />
                  <MiniStat label="Avg" value={Math.round(user.average_score).toLocaleString()} />
                  <MiniStat label="Games" value={user.games_played.toLocaleString()} />
                  <MiniStat label="Countries" value={userCoverage.countries.length.toLocaleString()} />
                </div>
              </div>
            ) : (
              <AuthCard />
            )}
          </div>
        </section>

        <section className="mt-24 border-t border-[var(--line)] pt-14">
          <div className="mb-8 max-w-3xl">
            <span className="chip chip-accent">The game</span>
            <h2 className="serif mt-4 text-5xl leading-none text-[var(--ink)] md:text-6xl">
              A sharper Street View challenge.
            </h2>
            <p className="atlas-copy mt-4">
              Three AI agents shape the match. The Curator picks the route, the Hint Guide drops staged
              clues, and the Rival fights for your points in PvE.
            </p>
          </div>

          <div className="atlas-card-grid">
            <FeatureCard
              icon={<Globe2 size={19} />}
              num="01"
              text="Real Street View coverage. Runtime coordinates are snapped toward playable public panoramas."
              title="Live panoramas"
            />
            <FeatureCard
              icon={<Brain size={19} />}
              num="02"
              text="The Hint Guide reads visible clues from the current frame and gives progressively stronger help."
              title="Staged hints"
            />
            <FeatureCard
              icon={<Bot size={19} />}
              num="03"
              text="Solo for personal bests or PvE, where the Rival reads the scene while you line up your pin."
              title="AI rival"
            />
            <FeatureCard
              icon={<Settings2 size={19} />}
              num="04"
              text="Rotation only, limited movement, free roaming, custom filters, and timer rules."
              title="Set the rules"
            />
          </div>
        </section>

        <section className="atlas-loop">
          <LoopStep label="Pick mode" num="01" sub="Solo · PvE" />
          <LoopStep label="Set rules" num="02" sub="Locations · timer" />
          <LoopStep label="Look around" num="03" sub="Read signs and roads" />
          <LoopStep label="Drop pin" num="04" sub="Commit guess" />
          <LoopStep label="Score" num="05" sub="Climb 25,000" />
        </section>

        <section className="surface mt-10 overflow-hidden p-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="world-coverage-frame min-h-64">
              <WorldCoverageMap allowWheelZoom={false} points={homeMapPoints} />
            </div>
            <div className="flex flex-col justify-center p-3">
              <span className="eyebrow">Field atlas</span>
              <h3 className="serif mt-2 text-3xl leading-tight text-[var(--ink)]">Every round leaves a mark.</h3>
              <p className="atlas-muted mt-3 text-sm leading-6">
                Country borders, continent labels, route pins, and score history give each match a place in
                the same atlas you carry into your profile.
              </p>
              <Link className="btn-secondary mt-5 self-start" to="/setup">
                <Target size={16} />
                Plan route
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="mono mt-1 text-lg text-[var(--ink)]">{value}</div>
    </div>
  );
}

function FeatureCard({
  num,
  icon,
  title,
  text,
}: {
  num: string;
  icon: JSX.Element;
  title: string;
  text: string;
}) {
  return (
    <div className="surface atlas-feature-card">
      <div className="atlas-feature-head">
        <span className="atlas-feature-icon">{icon}</span>
        <span className="mono text-xs tracking-[0.1em] text-[var(--ink-4)]">{num}</span>
      </div>
      <div className="serif atlas-feature-title">{title}</div>
      <p className="atlas-feature-text">{text}</p>
    </div>
  );
}

function LoopStep({ num, label, sub }: { num: string; label: string; sub: string }) {
  return (
    <div className="atlas-loop-step">
      <div className="mb-3 flex items-center gap-3">
        <span className="mono text-xs tracking-[0.12em] text-[var(--ink-4)]">{num}</span>
        <span className="atlas-loop-rule" />
      </div>
      <div className="serif text-lg text-[var(--ink)]">{label}</div>
      <div className="mt-1 text-xs text-[var(--ink-3)]">{sub}</div>
    </div>
  );
}
