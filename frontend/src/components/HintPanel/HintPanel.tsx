import { Lightbulb } from "lucide-react";
import { useState } from "react";

import { requestHint } from "../../agents/hintAgent";
import type { Coordinate, Hint } from "../../types/game";

type Props = {
  location: Coordinate;
  disabled: boolean;
  onHintUsed: (count: number) => void;
};

export function HintPanel({ location, disabled, onHintUsed }: Props) {
  const [hints, setHints] = useState<Hint[]>([]);
  const [busy, setBusy] = useState(false);

  async function getHint() {
    if (hints.length >= 3) return;
    setBusy(true);
    const hint = await requestHint(location, hints.length);
    const next = [...hints, hint];
    setHints(next);
    onHintUsed(next.length);
    setBusy(false);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink">Hints</h3>
          <p className="text-sm text-slate-500">Each hint lowers the maximum round score.</p>
        </div>
        <button
          className="flex items-center gap-2 rounded-md bg-sun px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
          <div key={hint.level} className="rounded-md bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-800">{hint.title}</div>
            <div className="text-sm text-slate-600">{hint.hint}</div>
            <div className="mt-1 text-xs text-slate-500">Max score: {Math.round(hint.max_score_multiplier * 100)}%</div>
          </div>
        ))}
        {!hints.length && <p className="text-sm text-slate-500">No hints used.</p>}
      </div>
    </div>
  );
}

