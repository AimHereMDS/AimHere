import { Trophy } from "lucide-react";

import type { PlayedRound } from "../../types/game";
import { formatKm, totalScore } from "../../utils/geo";

export function ScoreBoard({ rounds }: { rounds: PlayedRound[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-ink">
          <Trophy size={18} />
          Score
        </h3>
        <div className="text-xl font-bold text-field">{totalScore(rounds).toLocaleString()}</div>
      </div>
      <div className="space-y-2">
        {rounds.map((round) => (
          <div key={round.index} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
            <span>Round {round.index}</span>
            <span className="text-slate-500">{formatKm(round.result.distance_km)}</span>
            <span className="font-semibold">{round.result.score}</span>
          </div>
        ))}
        {!rounds.length && <p className="text-sm text-slate-500">No rounds submitted yet.</p>}
      </div>
    </div>
  );
}

