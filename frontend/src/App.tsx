import { LogOut, User } from "lucide-react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";

import { AtlasLogo, CoordStrip, WorldBackdrop } from "./components/Atlas/Atlas";
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
    `nav-link ${isActive ? "is-active" : ""}`;

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link className="nav-brand" to="/">
          <AtlasLogo size={30} />
          <span className="serif nav-brand-text">AIm Here</span>
          <span className="mono nav-brand-coord">48.8566N · 2.3522E</span>
        </Link>
        <nav className="nav-links">
          {user && (
            <NavLink className={linkClass} to="/setup">
              <span className="mono nav-link-num">01</span>
              Play
            </NavLink>
          )}
          <NavLink className={linkClass} to="/leaderboard">
            <span className="mono nav-link-num">02</span>
            Leaderboard
          </NavLink>
          {user && (
            <NavLink className={linkClass} to="/profile">
              <span className="mono nav-link-num">03</span>
              <User size={17} />
              Profile
            </NavLink>
          )}
        </nav>
        <div className="nav-actions">
          {user && (
            <button
              className="nav-icon-btn"
              onClick={logout}
              title="Sign out"
              type="button"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const location = useLocation();
  const isGameplay = location.pathname.startsWith("/game/");

  return (
    <div className="page-frame">
      {!isGameplay && <WorldBackdrop />}
      {!isGameplay && <Nav />}
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
      {!isGameplay && (
        <footer className="footer">
          <CoordStrip />
        </footer>
      )}
    </div>
  );
}
