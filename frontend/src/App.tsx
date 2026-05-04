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

function Nav() {
  const { user, logout } = useAuth();
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-bold transition-colors ${
      isActive ? "bg-teal-400/15 text-teal-200" : "text-slate-300 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/88 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4">
        <Link className="flex items-center gap-2 text-lg font-black tracking-tight text-white" to="/">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-400 text-slate-950 shadow-[0_4px_0_#0f766e]">
            <Compass size={22} strokeWidth={3} />
          </span>
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
              className="ml-2 rounded-md border border-white/10 p-2 text-slate-300 hover:bg-white/5 hover:text-white"
              onClick={logout}
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
