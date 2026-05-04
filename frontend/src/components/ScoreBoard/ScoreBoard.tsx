import { Trophy } from "lucide-react";

import type { PlayedRound } from "../../types/game";
import { formatKm, totalScore } from "../../utils/geo";

export function ScoreBoard({ rounds }: { rounds: PlayedRound[] }) {
  return (
    <div className="panel-soft p-4 text-white">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-black">
          <Trophy size={18} />
          Score
        </h3>
        <div className="text-xl font-black text-teal-300">{totalScore(rounds).toLocaleString()}</div>
      </div>
      <div className="space-y-2">
        {rounds.map((round) => (
          <div key={round.index} className="flex items-center justify-between rounded-md bg-white/10 px-3 py-2 text-sm">
            <span>Round {round.index}</span>
            <span className="text-slate-300">{formatKm(round.result.distance_km)}</span>
            <span className="font-black">{round.result.score}</span>
          </div>
        ))}
        {!rounds.length && <p className="text-sm text-slate-400">No rounds submitted yet.</p>}
      </div>
    </div>
  );
}
