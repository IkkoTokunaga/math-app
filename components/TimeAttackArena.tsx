"use client";

import { getBossLabel } from "@/lib/time-attack";
import type { TimeAttackState } from "@/lib/time-attack";

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
  const hpPercent = hpMax > 0 ? Math.max(0, Math.min(100, (displayHp / hpMax) * 100)) : 0;

  return (
    <div className={`time-attack-arena ${className}`.trim()}>
      <div className="time-attack-arena__hud">
        <p className="time-attack-arena__boss-name">{getBossLabel(state)}</p>
        <div className="time-attack-gauge time-attack-gauge--hp">
          <div className="time-attack-gauge__header">
            <span>鬼 HP</span>
          </div>
          <div className="time-attack-gauge__track">
            <div
              className={`time-attack-gauge__fill time-attack-gauge__fill--hp ${hpHit ? "time-attack-gauge__fill--hit" : ""}`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
