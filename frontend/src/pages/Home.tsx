import { Bot, Brain, Compass, Globe2, MapPinned, PlayCircle, Sparkles, Target, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

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
  return (
    <main className="app-shell">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 map-bg" />
        <div className="absolute inset-0 grid-bg opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_78%)]" />
        <div className="mx-auto grid min-h-[calc(100vh-72px)] max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative">
            <div className="chip mb-5">
              <Sparkles size={14} />
              AI-powered geo battles
            </div>
            <h1 className="max-w-3xl text-5xl font-black uppercase leading-[0.96] tracking-tight text-white md:text-7xl">
              Explore.
              <br />
              Guess.
              <br />
              <span className="text-teal-300">Outscore.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Drop into live Street View, read the scene, place your pin, ask for progressive hints, and
              challenge an AI opponent over five fast rounds.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link className="btn-gg" to={user ? "/setup" : "/#auth"}>
                <MapPinned size={19} strokeWidth={3} />
                Play now
              </Link>
              <Link className="btn-secondary" to="/leaderboard">
                <Trophy size={19} />
                Leaderboard
              </Link>
            </div>
            <div className="mt-12 grid max-w-xl grid-cols-3 overflow-hidden rounded-lg border border-white/10 bg-white/10">
              <Stat label="Rounds" value="5" />
              <Stat label="Max score" value="25K" />
              <Stat label="Agents" value="3" />
            </div>
          </div>
          <div className="relative" id="auth">
            {user ? (
              <div className="panel p-6">
                <div className="chip chip-amber mb-4">
                  <Compass size={14} />
                  Signed in
                </div>
                <h2 className="text-2xl font-black text-white">Ready for a new match</h2>
                <p className="mt-2 text-slate-300">{user.email}</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Link className="btn-gg px-4 py-3 text-sm" to="/setup">
                    New match
                  </Link>
                  <Link className="btn-secondary px-4 py-3 text-sm" to="/profile">
                    Profile
                  </Link>
                </div>
                {savedGame && savedGame.rounds.length < 5 && (
                  <Link
                    className="mt-4 flex items-center justify-between rounded-md border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-black text-amber-100 transition hover:border-amber-200/70 hover:bg-amber-300/15"
                    to={`/game/${savedGame.id}`}
                  >
                    <span className="flex items-center gap-2">
                      <PlayCircle size={17} />
                      Resume saved match
                    </span>
                    <span>{savedGame.rounds.length}/5</span>
                  </Link>
                )}
              </div>
            ) : (
              <AuthCard />
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8">
          <div className="chip chip-amber mb-3">The game</div>
          <h2 className="text-3xl font-black text-white md:text-4xl">A sharper Street View challenge</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Globe2, title: "Live panoramas", text: "Runtime locations are snapped toward playable public Street View coverage." },
            { icon: Brain, title: "Agent help", text: "Curator selects themes, Hint gives staged clues, Opponent plays PvE after your guess." },
            { icon: Target, title: "Custom rules", text: "Rotation-only, limited steps, free movement, timers, and easy to hard AI difficulty." },
          ].map((item) => (
            <div className="panel p-5" key={item.title}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-teal-300/35 bg-teal-300/10 text-teal-200">
                <item.icon size={22} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 panel p-6">
          <div className="grid gap-5 md:grid-cols-4">
            {[
              { icon: Bot, title: "Pick mode", text: "Solo or PvE." },
              { icon: Globe2, title: "Look around", text: "Read signs and roads." },
              { icon: MapPinned, title: "Drop pin", text: "Commit your guess." },
              { icon: Trophy, title: "Score", text: "Five rounds to climb." },
            ].map((step) => (
              <div key={step.title}>
                <step.icon className="mb-3 text-amber-300" size={24} />
                <div className="font-black uppercase tracking-tight text-white">{step.title}</div>
                <div className="mt-1 text-sm text-slate-400">{step.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-r border-white/10 px-4 py-4 last:border-r-0">
      <div className="text-3xl font-black text-teal-300">{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
    </div>
  );
}
