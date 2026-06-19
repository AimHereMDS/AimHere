import { ChevronDown, Lightbulb } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { requestHint } from "../../agents/hintAgent";
import type { Coordinate, Hint, PanoramaView } from "../../types/game";

type Props = {
  location: Coordinate;
  view?: PanoramaView | null;
  sourcePrompt?: string | null;
  disabled: boolean;
  onHintsChange: (hints: Hint[]) => void;
};

export function HintPanel({ location, view, sourcePrompt, disabled, onHintsChange }: Props) {
  const [hints, setHints] = useState<Hint[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);
  const isMounted = useRef(true);
  const busyRef = useRef(false);
  const onHintsChangeRef = useRef(onHintsChange);

  useEffect(() => {
    onHintsChangeRef.current = onHintsChange;
  }, [onHintsChange]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    onHintsChangeRef.current(hints);
  }, [hints]);

  async function getHint() {
    if (busyRef.current || hints.length >= 3) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const hint = await requestHint(location, hints.length, view, sourcePrompt);
      if (!isMounted.current) return;
      setHints((current) => (current.length >= 3 ? current : [...current, hint]));
      setExpandedLevel(hint.level);
    } catch (err) {
      if (!isMounted.current) return;
      setError(err instanceof Error ? err.message : "Failed to load hint");
    } finally {
      busyRef.current = false;
      if (isMounted.current) setBusy(false);
    }
  }

  function toggleHint(level: number) {
    setExpandedLevel((current) => (current === level ? null : level));
  }

  return (
    <div className="panel-soft p-4 text-[var(--ink)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Hint guide</div>
          <h3 className="serif mt-1 text-lg leading-none">Field clues</h3>
          <p className="mt-1 text-sm text-[var(--ink-3)]">Each hint lowers the maximum round score.</p>
        </div>
        <button
          className="btn-gg btn-sm disabled:opacity-50"
          disabled={disabled || busy || hints.length >= 3}
          onClick={getHint}
          type="button"
        >
          <Lightbulb size={17} />
          Hint
        </button>
      </div>
      <div className="max-h-[40vh] space-y-1.5 overflow-y-auto pr-1">
        {error && <div className="rounded-md border border-[color-mix(in_oklab,var(--neg),transparent_55%)] bg-[var(--neg-soft)] p-3 text-sm text-[var(--ink)]">{error}</div>}
        {hints.map((hint) => {
          const isOpen = expandedLevel === hint.level;
          return (
            <div key={hint.level} className="rounded-md border border-[var(--line)] bg-[var(--bg-inset)]">
              <button
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                onClick={() => toggleHint(hint.level)}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <span className="mono text-[10px] tracking-[0.14em] text-[var(--hint)]">0{hint.level}</span>
                  <span className="text-sm font-semibold text-[var(--ink)]">{hint.title}</span>
                  <span className="text-xs text-[var(--ink-3)]">{Math.round(hint.max_score_multiplier * 100)}%</span>
                </div>
                <ChevronDown
                  className={`text-[var(--ink-3)] transition-transform ${isOpen ? "rotate-180" : ""}`}
                  size={16}
                />
              </button>
              {isOpen && (
                <div className="border-t border-[var(--line-soft)] px-3 py-2 text-sm leading-6 text-[var(--ink-2)]">{hint.hint}</div>
              )}
            </div>
          );
        })}
        {!hints.length && <p className="text-sm text-[var(--ink-3)]">No hints used.</p>}
      </div>
    </div>
  );
}
