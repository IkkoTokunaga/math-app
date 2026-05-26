"use client";

import { forwardRef } from "react";
import { TimeAttackLives, type HeartRecoveryAnim } from "@/components/TimeAttackLives";
import { getWaveMaxScoreForState } from "@/lib/time-attack";
import type { TimeAttackState } from "@/lib/time-attack";

type AttackDrainOverlay = {
  score: number;
  maxScore: number;
  draining: boolean;
};

type TimeAttackScoreBarProps = {
  state: TimeAttackState;
  /** 光の演出が届くまでの表示用スコア */
  displayScore?: number;
  /** 裏で進行中のウェーブ攻撃のゲージ排出オーバーレイ */
  attackDrain?: AttackDrainOverlay | null;
  charging?: boolean;
  draining?: boolean;
  mistakeCount?: number;
  maxMistakes?: number;
  heartRecovery?: HeartRecoveryAnim | null;
  className?: string;
};

export const TimeAttackScoreBar = forwardRef<HTMLDivElement, TimeAttackScoreBarProps>(
  function TimeAttackScoreBar(
    {
      state,
      displayScore,
      attackDrain = null,
      charging = false,
      draining = false,
      mistakeCount = 0,
      maxMistakes = 3,
      heartRecovery = null,
      className = "",
    },
    ref,
  ) {
    const maxScore = getWaveMaxScoreForState(state);
    const liveScore = displayScore ?? state.waveScoreAccumulated;
    const liveFillPercent =
      maxScore > 0 ? Math.min(100, (liveScore / maxScore) * 100) : 0;
    const attackDrainPercent =
      attackDrain && attackDrain.maxScore > 0
        ? Math.min(100, (attackDrain.score / attackDrain.maxScore) * 100)
        : 0;
    const pulsing = attackDrain != null || charging || draining;

    return (
      <div
        className={`time-attack-gauge time-attack-gauge--attack ${pulsing ? "time-attack-gauge--pulse" : ""} ${charging ? "time-attack-gauge--charging" : ""} ${draining ? "time-attack-gauge--draining" : ""} ${className}`.trim()}
      >
        <div className="time-attack-gauge__header">
          <span>攻撃ゲージ</span>
        </div>
        <div ref={ref} className="time-attack-gauge__track">
          <div
            className="time-attack-gauge__fill time-attack-gauge__fill--attack"
            style={{ width: `${liveFillPercent}%` }}
          />
          {attackDrain != null && attackDrain.maxScore > 0 && (
            <div
              className={`time-attack-gauge__fill time-attack-gauge__fill--attack time-attack-gauge__fill--attack-overlay ${attackDrain.draining ? "time-attack-gauge__fill--draining" : ""}`}
              style={{ width: `${attackDrainPercent}%` }}
            />
          )}
        </div>
        <TimeAttackLives
          mistakeCount={mistakeCount}
          maxMistakes={maxMistakes}
          heartRecovery={heartRecovery}
        />
      </div>
    );
  },
);
