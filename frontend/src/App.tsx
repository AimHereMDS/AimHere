import { Compass, LogOut, User } from "lucide-react";
import { Link, NavLink, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/Auth/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";
import { Game } from "./pages/Game";
import { GameSetup } from "./pages/GameSetup";
import { Home } from "./pages/Home";
import { Leaderboard } from "./pages/Leaderboard";
import { Profile } from "./pages/Profile";
import { Results } from "./pages/Results";
import { supabase } from "./utils/supabase";

function Nav() {
  const { user } = useAuth();
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-semibold ${isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4">
        <Link className="flex items-center gap-2 text-lg font-bold text-ink" to="/">
          <Compass className="text-field" size={24} />
          AIm Here
        </Link>
        <nav className="flex items-center gap-1">
          {user && <NavLink className={linkClass} to="/setup">Play</NavLink>}
          <NavLink className={linkClass} to="/leaderboard">Leaderboard</NavLink>
          {user && (
            <NavLink className={linkClass} to="/profile">
              <User size={17} />
            </NavLink>
          )}
          {user && (
            <button
              className="ml-2 rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
              onClick={() => supabase.auth.signOut()}
              title="Sign out"
              type="button"
            >
              <LogOut size={18} />
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route element={<Home />} path="/" />
        <Route element={<Leaderboard />} path="/leaderboard" />
        <Route
          element={
            <ProtectedRoute>
              <GameSetup />
            </ProtectedRoute>
          }
          path="/setup"
        />
        <Route
          element={
            <ProtectedRoute>
              <Game />
            </ProtectedRoute>
          }
          path="/game/:gameId"
        />
        <Route
          element={
            <ProtectedRoute>
              <Results />
            </ProtectedRoute>
          }
          path="/results"
        />
        <Route
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
          path="/profile"
        />
      </Routes>
    </>
  );
}

