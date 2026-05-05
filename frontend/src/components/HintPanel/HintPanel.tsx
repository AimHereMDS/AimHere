import { Lightbulb } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { requestHint } from "../../agents/hintAgent";
import type { Coordinate, Hint, PanoramaView } from "../../types/game";

type Props = {
  location: Coordinate;
  view?: PanoramaView | null;
  disabled: boolean;
  onHintsUpdate: (hints: Hint[]) => void;
};

export function HintPanel({ location, view, disabled, onHintsUpdate }: Props) {
  const [hints, setHints] = useState<Hint[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    setHints([]);
    setBusy(false);
    setError("");
    onHintsUpdate([]);
  }, [location.lat, location.lng, onHintsUpdate]);

  async function getHint() {
    if (hints.length >= 3) return;
    setBusy(true);
    setError("");
    try {
      const hint = await requestHint(location, hints.length, view);
      if (!isMounted.current) return;
      const next = [...hints, hint];
      setHints(next);
      onHintsUpdate(next);
    } catch (err) {
      if (!isMounted.current) return;
      setError(err instanceof Error ? err.message : "Failed to load hint");
    } finally {
      if (isMounted.current) setBusy(false);
    }
  }

  return (
    <div className="panel-soft p-4 text-white">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-black">Hints</h3>
          <p className="text-sm text-slate-400">Each hint lowers the maximum round score.</p>
        </div>
        <button
          className="flex items-center gap-2 rounded-md bg-amber-400 px-3 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
          disabled={disabled || busy || hints.length >= 3}
          onClick={getHint}
          type="button"
        >
          <Lightbulb size={17} />
          Hint
        </button>
      </div>
      <div className="space-y-2">
        {error && <div className="rounded-md bg-red-950/50 p-3 text-sm text-red-200">{error}</div>}
        {hints.map((hint) => (
          <div key={hint.level} className="rounded-md bg-white/10 p-3">
            <div className="text-sm font-black text-amber-200">{hint.title}</div>
            <div className="text-sm text-slate-200">{hint.hint}</div>
            <div className="mt-1 text-xs text-slate-400">Max score: {Math.round(hint.max_score_multiplier * 100)}%</div>
          </div>
        ))}
        {!hints.length && <p className="text-sm text-slate-400">No hints used.</p>}
      </div>
    </div>
  );
}
