import { Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";

import { requestHint } from "../../agents/hintAgent";
import type { Coordinate, Hint, PanoramaView } from "../../types/game";

type Props = {
  location: Coordinate;
  view?: PanoramaView | null;
  disabled: boolean;
  onHintUsed: (count: number) => void;
};

export function HintPanel({ location, view, disabled, onHintUsed }: Props) {
  const [hints, setHints] = useState<Hint[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setHints([]);
    setBusy(false);
    onHintUsed(0);
  }, [location.lat, location.lng, onHintUsed]);

  async function getHint() {
    if (hints.length >= 3) return;
    setBusy(true);
    const hint = await requestHint(location, hints.length, view);
    const next = [...hints, hint];
    setHints(next);
    onHintUsed(next.length);
    setBusy(false);
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
