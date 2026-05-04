import { LogIn, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";

import { useAuth } from "../../hooks/useAuth";

export function AuthCard() {
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "login") {
        await login(email, password);
        setMessage("Signed in.");
      } else {
        await register(email, password);
        setMessage("Account created.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
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
            onClick={() => setMode("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={`rounded px-3 py-1.5 text-sm font-semibold ${mode === "register" ? "bg-teal-400 text-slate-950" : "text-slate-400"}`}
            onClick={() => setMode("register")}
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
        <button
          className="flex w-full items-center justify-center gap-2 rounded-md bg-teal-400 px-4 py-2 font-black text-slate-950 disabled:opacity-60"
          disabled={busy}
        >
          {mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
          {mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
      {message && <p className="mt-3 rounded-md bg-white/10 px-3 py-2 text-sm text-slate-200">{message}</p>}
    </div>
  );
}
