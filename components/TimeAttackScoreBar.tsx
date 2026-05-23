"use client";

import { forwardRef } from "react";
import { TimeAttackLives } from "@/components/TimeAttackLives";
import { getWaveMaxScoreForState } from "@/lib/time-attack";
import type { TimeAttackState } from "@/lib/time-attack";

type TimeAttackScoreBarProps = {
  state: TimeAttackState;
  /** ビーム演出中はウェーブ得点をフル表示 */
  previewWaveScore?: number | null;
  /** 光の演出が届くまでの表示用スコア */
  displayScore?: number;
  charging?: boolean;
  draining?: boolean;
  mistakeCount?: number;
  maxMistakes?: number;
  className?: string;
};

export const TimeAttackScoreBar = forwardRef<HTMLDivElement, TimeAttackScoreBarProps>(
  function TimeAttackScoreBar(
    {
      state,
      previewWaveScore = null,
      displayScore,
      charging = false,
      draining = false,
      mistakeCount = 0,
      maxMistakes = 3,
      className = "",
    },
    ref,
  ) {
    const maxScore = getWaveMaxScoreForState(state);
    const currentScore = previewWaveScore ?? displayScore ?? state.waveScoreAccumulated;
    const fillPercent =
      maxScore > 0 ? Math.min(100, (currentScore / maxScore) * 100) : 0;
    const pulsing = previewWaveScore != null || charging || draining;

    return (
      <div
        className={`time-attack-gauge time-attack-gauge--attack ${pulsing ? "time-attack-gauge--pulse" : ""} ${charging ? "time-attack-gauge--charging" : ""} ${draining ? "time-attack-gauge--draining" : ""} ${className}`.trim()}
      >
        <div className="time-attack-gauge__header">
          <span>攻撃ゲージ（10問）</span>
        </div>
        <div ref={ref} className="time-attack-gauge__track">
          <div
            className={`time-attack-gauge__fill time-attack-gauge__fill--attack ${draining ? "time-attack-gauge__fill--draining" : ""}`}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
        <TimeAttackLives mistakeCount={mistakeCount} maxMistakes={maxMistakes} />
      </div>
    );
  },
);
