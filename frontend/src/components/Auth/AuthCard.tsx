import { LogIn, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";

import { useAuth } from "../../hooks/useAuth";

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
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Account</h2>
          <p className="text-sm text-slate-400">Email and password sign-in.</p>
        </div>
        <div className="flex rounded-md border border-white/10 bg-slate-950/50 p-1">
          <button
            className={`rounded px-3 py-1.5 text-sm font-semibold ${mode === "login" ? "bg-teal-400 text-slate-950" : "text-slate-400"}`}
            onClick={() => switchMode("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={`rounded px-3 py-1.5 text-sm font-semibold ${mode === "register" ? "bg-teal-400 text-slate-950" : "text-slate-400"}`}
            onClick={() => switchMode("register")}
            type="button"
          >
            Register
          </button>
        </div>
      </div>
      <form className="space-y-3" onSubmit={submit}>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-300">Email</span>
          <input
            className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-teal-300"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-300">Password</span>
          <input
            className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-teal-300"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
            required
          />
        </label>
        {mode === "register" && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-300">Confirm password</span>
            <input
              className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-teal-300"
              minLength={6}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              value={confirmPassword}
              required
            />
          </label>
        )}
        <button
          className="flex w-full items-center justify-center gap-2 rounded-md bg-teal-400 px-4 py-2 font-black text-slate-950 disabled:opacity-60"
          disabled={busy}
        >
          {mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
          {mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
      {feedback && (
        <p
          className={`mt-3 rounded-md px-3 py-2 text-sm ${
            feedback.kind === "error"
              ? "border border-red-400/40 bg-red-600/20 text-red-100"
              : "border border-teal-300/30 bg-teal-400/10 text-teal-100"
          }`}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}
