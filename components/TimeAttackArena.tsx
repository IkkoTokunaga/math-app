"use client";

import { getBossHpLabel, type TimeAttackState } from "@/lib/time-attack";
import { getOniHpRatio } from "@/lib/time-attack-scoring";

type TimeAttackArenaProps = {
  state: TimeAttackState;
  displayHp: number;
  hpMax: number;
  hpHit?: boolean;
  className?: string;
};

export function TimeAttackArena({
  state,
  displayHp,
  hpMax,
  hpHit = false,
  className = "",
}: TimeAttackArenaProps) {
  const segmentCount = getOniHpRatio(state.currentLevel, state.enmaNumber);
  const safeHpMax = Math.max(hpMax, displayHp, 1);
  const hpRatio = Math.max(0, Math.min(1, displayHp / safeHpMax));

  return (
    <div className={`time-attack-arena ${className}`.trim()}>
      <div className="time-attack-arena__hud">
        <div className="time-attack-gauge time-attack-gauge--hp">
          <div className="time-attack-gauge__header">
            <span>{getBossHpLabel(state)}</span>
          </div>
          <div className="time-attack-gauge__track time-attack-gauge__track--segmented">
            <div
              className={`time-attack-gauge__fill time-attack-gauge__fill--hp ${displayHp > 0 ? "time-attack-gauge__fill--has-hp" : ""} ${hpHit ? "time-attack-gauge__fill--hit" : ""}`}
              style={{ width: `${hpRatio * 100}%` }}
            />
            {Array.from({ length: Math.max(0, segmentCount - 1) }, (_, index) => (
              <span
                key={index}
                className="time-attack-gauge__segment-marker"
                style={{ left: `${((index + 1) / segmentCount) * 100}%` }}
                aria-hidden
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
