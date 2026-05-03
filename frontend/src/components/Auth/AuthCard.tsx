import { LogIn, Mail, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";

import { supabase } from "../../utils/supabase";

export function AuthCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (response.error) {
      setMessage(response.error.message);
    } else {
      setMessage(mode === "register" ? "Check your email if confirmation is enabled." : "Signed in.");
    }
  }

  async function googleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Account</h2>
          <p className="text-sm text-slate-500">Supabase email/password or Google OAuth.</p>
        </div>
        <div className="flex rounded-md border border-slate-200 p-1">
          <button
            className={`rounded px-3 py-1.5 text-sm ${mode === "login" ? "bg-ink text-white" : "text-slate-600"}`}
            onClick={() => setMode("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={`rounded px-3 py-1.5 text-sm ${mode === "register" ? "bg-ink text-white" : "text-slate-600"}`}
            onClick={() => setMode("register")}
            type="button"
          >
            Register
          </button>
        </div>
      </div>
      <form className="space-y-3" onSubmit={submit}>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-field"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-field"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
            required
          />
        </label>
        <button
          className="flex w-full items-center justify-center gap-2 rounded-md bg-field px-4 py-2 font-semibold text-white disabled:opacity-60"
          disabled={busy}
        >
          {mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
          {mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
      <button
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-800"
        onClick={googleLogin}
        type="button"
      >
        <Mail size={18} />
        Continue with Google
      </button>
      {message && <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>}
    </div>
  );
}

