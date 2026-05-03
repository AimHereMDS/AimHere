import { Compass, MapPinned, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

import { AuthCard } from "../components/Auth/AuthCard";
import { useAuth } from "../hooks/useAuth";

export function Home() {
  const { user } = useAuth();
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto grid min-h-[calc(100vh-72px)] max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-md bg-teal-50 px-3 py-2 text-sm font-semibold text-field">
            <Compass size={17} />
            AIm Here
          </div>
          <h1 className="max-w-3xl text-5xl font-bold leading-tight text-ink md:text-6xl">AI-powered Street View guessing.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Play five-round GeoGuessr-style matches with runtime random panoramas, custom AI-curated challenges,
            progressive hints, and a PvE opponent that reasons from the same scene.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="flex items-center gap-2 rounded-md bg-field px-5 py-3 font-semibold text-white" to={user ? "/setup" : "/"}>
              <MapPinned size={19} />
              Start game
            </Link>
            <Link className="flex items-center gap-2 rounded-md border border-slate-300 px-5 py-3 font-semibold text-slate-800" to="/leaderboard">
              <Trophy size={19} />
              Leaderboard
            </Link>
          </div>
        </div>
        {user ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
            <h2 className="text-xl font-semibold text-ink">Signed in</h2>
            <p className="mt-2 text-slate-600">{user.email}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link className="rounded-md bg-field px-4 py-3 text-center font-semibold text-white" to="/setup">
                New match
              </Link>
              <Link className="rounded-md border border-slate-300 px-4 py-3 text-center font-semibold text-slate-800" to="/profile">
                Profile
              </Link>
            </div>
          </div>
        ) : (
          <AuthCard />
        )}
      </section>
    </main>
  );
}

