"use client";

export type HeartRecoveryPhase = "expand" | "fill";

export type HeartRecoveryAnim = {
  index: number;
  phase: HeartRecoveryPhase;
};

type TimeAttackLivesProps = {
  mistakeCount: number;
  maxMistakes: number;
  heartRecovery?: HeartRecoveryAnim | null;
  className?: string;
};

export function TimeAttackLives({
  mistakeCount,
  maxMistakes,
  heartRecovery = null,
  className = "",
}: TimeAttackLivesProps) {
  const remaining = Math.max(0, maxMistakes - mistakeCount);

  return (
    <div
      className={`time-attack-lives ${className}`.trim()}
      aria-label={`残りライフ ${remaining}`}
    >
      {Array.from({ length: maxMistakes }, (_, index) => {
        const filled = index < remaining;
        const recovering = heartRecovery?.index === index;
        const recoveryClass =
          recovering && heartRecovery.phase === "expand"
            ? "time-attack-lives__heart--recover-expand"
            : recovering && heartRecovery.phase === "fill"
              ? "time-attack-lives__heart--recover-fill"
              : "";

        return (
          <span
            key={index}
            className={`time-attack-lives__heart ${filled ? "time-attack-lives__heart--full" : "time-attack-lives__heart--lost"} ${recoveryClass}`.trim()}
            aria-hidden="true"
          >
            ♥
          </span>
        );
      })}
    </div>
  );
}
