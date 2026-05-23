"use client";

import { getBossLabel, isEnmaBoss } from "@/lib/time-attack";
import type { TimeAttackState } from "@/lib/time-attack";

const ONI_HUE_BY_LEVEL: Record<number, string> = {
  1: "hue-rotate(0deg)",
  2: "hue-rotate(30deg)",
  3: "hue-rotate(60deg)",
  4: "hue-rotate(90deg)",
  5: "hue-rotate(120deg)",
  6: "hue-rotate(180deg)",
  7: "hue-rotate(210deg)",
  8: "hue-rotate(240deg)",
  9: "hue-rotate(270deg)",
};

type OniBossDisplayProps = {
  state: TimeAttackState;
  beamActive?: boolean;
  beamScore?: number;
};

export function OniBossDisplay({ state, beamActive = false, beamScore = 0 }: OniBossDisplayProps) {
  const hpPercent =
    state.oniHpMax > 0 ? Math.max(0, (state.oniHpRemaining / state.oniHpMax) * 100) : 0;
  const enma = isEnmaBoss(state.currentLevel, state.enmaNumber);
  const filterStyle = enma
    ? undefined
    : { filter: ONI_HUE_BY_LEVEL[state.currentLevel] ?? "none" };

  return (
    <div className="oni-boss-display" aria-hidden="true">
      <div className={`oni-boss-display__figure ${enma ? "oni-boss-display__figure--enma" : ""}`}>
        <span className="oni-boss-display__emoji" style={filterStyle}>
          {enma ? "👹" : "👺"}
        </span>
        {beamActive && (
          <div
            className="oni-boss-display__beam"
            style={{ opacity: Math.min(1, 0.35 + beamScore / 2000) }}
          />
        )}
      </div>
      <div className="oni-boss-display__info">
        <p className="oni-boss-display__name">{getBossLabel(state)}</p>
        <div className="oni-boss-display__hp-track">
          <div className="oni-boss-display__hp-fill" style={{ width: `${hpPercent}%` }} />
        </div>
        <p className="oni-boss-display__hp-text">
          HP {Math.max(0, state.oniHpRemaining)} / {state.oniHpMax}
        </p>
      </div>
    </div>
  );
}
