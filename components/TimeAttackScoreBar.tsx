"use client";

import { getWaveMaxScoreForState } from "@/lib/time-attack";
import type { TimeAttackState } from "@/lib/time-attack";

type TimeAttackScoreBarProps = {
  state: TimeAttackState;
};

export function TimeAttackScoreBar({ state }: TimeAttackScoreBarProps) {
  const maxScore = getWaveMaxScoreForState(state);
  const fillPercent =
    maxScore > 0 ? Math.min(100, (state.waveScoreAccumulated / maxScore) * 100) : 0;

  return (
    <div className="time-attack-score-bar">
      <div className="time-attack-score-bar__labels">
        <span className="text-sm text-muted">ウェーブ得点</span>
        <span className="text-sm font-bold">
          {state.waveScoreAccumulated} / {maxScore}
        </span>
      </div>
      <div className="time-attack-score-bar__track">
        <div
          className="time-attack-score-bar__fill"
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </div>
  );
}
