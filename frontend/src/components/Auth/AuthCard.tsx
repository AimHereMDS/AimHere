import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";

import { useAuth } from "../../hooks/useAuth";
import { CompassRose } from "../Atlas/Atlas";

type Mode = "login" | "register";
type FeedbackKind = "error" | "success";
type Feedback = { kind: FeedbackKind; text: string } | null;

export function AuthCard() {
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<Mode>("login");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFeedback(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "register" && password !== confirmPassword) {
      setFeedback({ kind: "error", text: "Passwords do not match." });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      if (mode === "login") {
        await login(email, password);
        setFeedback({ kind: "success", text: "Signed in." });
      } else {
        await register(email, password);
        setFeedback({ kind: "success", text: "Account created." });
      }
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Authentication failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface overflow-hidden">
      <div className="grid md:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden border-r border-[var(--line)] p-6 md:block">
          <CompassRose size={118} spin />
          <div className="eyebrow mt-6">Field log · entry 0001</div>
          <h2 className="serif mt-3 text-4xl leading-none text-[var(--ink)]">
            Sign in.
            <br />
            Keep your route.
          </h2>
          <p className="atlas-muted mt-4 text-sm leading-6">
            Track scores, climb the table, and resume the match where the last panorama stopped.
          </p>
          <div className="mono mt-6 flex flex-wrap gap-3 border-t border-[var(--line)] pt-4 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]">
            <span>N 51 28 40</span>
            <span>W 000 00 05</span>
          </div>
        </div>

        <div className="p-4">
          <div className="flex gap-1 rounded-[var(--radius-sm)] bg-[var(--bg-inset)] p-1">
            <button
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                mode === "login" ? "bg-[var(--bg-card)] text-[var(--ink)] shadow-[0_1px_0_var(--line)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]"
              }`}
              onClick={() => switchMode("login")}
              type="button"
            >
              <span className="mono text-[10px] text-[var(--accent)]">01</span>
              Sign in
            </button>
            <button
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                mode === "register" ? "bg-[var(--bg-card)] text-[var(--ink)] shadow-[0_1px_0_var(--line)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]"
              }`}
              onClick={() => switchMode("register")}
              type="button"
            >
              <span className="mono text-[10px] text-[var(--accent)]">02</span>
              Create account
            </button>
          </div>

          <form className="space-y-4 p-3 pt-6" onSubmit={submit}>
            <label className="block">
              <span className="atlas-label">Email</span>
              <input
                className="atlas-input"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@earth.org"
                type="email"
                value={email}
                required
              />
            </label>
            <label className="block">
              <span className="atlas-label">Password</span>
              <input
                className="atlas-input"
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="password"
                type="password"
                value={password}
                required
              />
            </label>
            {mode === "register" && (
              <label className="block">
                <span className="atlas-label">Confirm password</span>
                <input
                  className="atlas-input"
                  minLength={6}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="password"
                  type="password"
                  value={confirmPassword}
                  required
                />
              </label>
            )}
            <button className="btn-gg w-full" disabled={busy}>
              {mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
              {busy ? "Checking route..." : mode === "login" ? "Sign in" : "Create account"}
              <ArrowRight size={16} />
            </button>
          </form>

          {feedback && (
            <p
              className={`mx-3 mb-3 rounded-md border px-3 py-2 text-sm ${
                feedback.kind === "error"
                  ? "border-[color-mix(in_oklab,var(--neg),transparent_55%)] bg-[var(--neg-soft)] text-[var(--ink)]"
                  : "border-[color-mix(in_oklab,var(--pos),transparent_55%)] bg-[var(--pos-soft)] text-[var(--ink)]"
              }`}
            >
              {feedback.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
