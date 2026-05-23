"use client";

import { getWaveMaxScoreForState } from "@/lib/time-attack";
import type { TimeAttackState } from "@/lib/time-attack";

type TimeAttackScoreBarProps = {
  state: TimeAttackState;
  /** ビーム演出中はウェーブ得点をフル表示 */
  previewWaveScore?: number | null;
  className?: string;
};

export function TimeAttackScoreBar({
  state,
  previewWaveScore = null,
  className = "",
}: TimeAttackScoreBarProps) {
  const maxScore = getWaveMaxScoreForState(state);
  const currentScore = previewWaveScore ?? state.waveScoreAccumulated;
  const fillPercent =
    maxScore > 0 ? Math.min(100, (currentScore / maxScore) * 100) : 0;
  const pulsing = previewWaveScore != null;

  return (
    <div
      className={`time-attack-gauge time-attack-gauge--attack ${pulsing ? "time-attack-gauge--pulse" : ""} ${className}`.trim()}
    >
      <div className="time-attack-gauge__header">
        <span>攻撃ゲージ（10問）</span>
        <span className="time-attack-gauge__values">
          {currentScore} / {maxScore}
        </span>
      </div>
      <div className="time-attack-gauge__track">
        <div
          className="time-attack-gauge__fill time-attack-gauge__fill--attack"
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </div>
  );
}
