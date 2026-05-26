import { Trophy } from "lucide-react";

import type { PlayedRound } from "../../types/game";
import { formatKm, totalScore } from "../../utils/geo";

export function ScoreBoard({ rounds }: { rounds: PlayedRound[] }) {
  return (
    <div className="panel-soft p-4 text-[var(--ink)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2">
          <Trophy size={18} />
          <span className="serif text-lg">Round log</span>
        </h3>
        <div className="mono text-xl text-[var(--accent)]">{totalScore(rounds).toLocaleString()}</div>
      </div>
      <div className="space-y-2">
        {rounds.map((round) => (
          <div key={round.index} className="flex items-center justify-between rounded-md border border-[var(--line)] bg-[var(--bg-inset)] px-3 py-2 text-sm">
            <span className="mono text-[10px] tracking-[0.12em] text-[var(--ink-3)]">R{round.index}</span>
            <span className="text-[var(--ink-3)]">{formatKm(round.result.distance_km)}</span>
            <span className="mono text-[var(--ink)]">{round.result.score.toLocaleString()}</span>
          </div>
        ))}
        {!rounds.length && <p className="text-sm text-[var(--ink-3)]">No rounds submitted yet.</p>}
      </div>
    </div>
  );
}
