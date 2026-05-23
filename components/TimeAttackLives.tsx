"use client";

type TimeAttackLivesProps = {
  mistakeCount: number;
  maxMistakes: number;
  className?: string;
};

export function TimeAttackLives({
  mistakeCount,
  maxMistakes,
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
        return (
          <span
            key={index}
            className={`time-attack-lives__heart ${filled ? "time-attack-lives__heart--full" : "time-attack-lives__heart--lost"}`}
            aria-hidden="true"
          >
            ♥
          </span>
        );
      })}
    </div>
  );
}
