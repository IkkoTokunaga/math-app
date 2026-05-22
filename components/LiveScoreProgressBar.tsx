"use client";

import {
  STAR_COUNT,
  calculateMaxPossibleSessionScore,
  calculateStars,
  getStarScoreThreshold,
} from "@/lib/scoring";
import { QUESTIONS_PER_SESSION, type Level } from "@/lib/questions";

type LiveScoreProgressBarProps = {
  level: Level;
  totalScore: number;
  totalQuestions?: number;
};

function getThresholdPercent(threshold: number, maxPossibleScore: number): number {
  return maxPossibleScore > 0 ? Math.min(100, (threshold / maxPossibleScore) * 100) : 0;
}

export function LiveScoreProgressBar({
  level,
  totalScore,
  totalQuestions = QUESTIONS_PER_SESSION,
}: LiveScoreProgressBarProps) {
  const maxPossibleScore = calculateMaxPossibleSessionScore(level, totalQuestions);
  const fillPercent = getThresholdPercent(totalScore, maxPossibleScore);
  const barPhase = fillPercent / 100;
  const stars = calculateStars(totalScore, maxPossibleScore);
  const isPerfect = stars >= STAR_COUNT;

  const milestones = Array.from({ length: STAR_COUNT }, (_, index) => {
    const starCount = index + 1;
    const threshold = getStarScoreThreshold(starCount, maxPossibleScore);
    return {
      starCount,
      percent: getThresholdPercent(threshold, maxPossibleScore),
      earned: stars >= starCount,
    };
  });

  return (
    <div className="live-score-progress-bar" aria-hidden="true">
      <div className="live-score-progress-frame">
        {milestones.map(({ starCount, percent, earned }) => (
          <div
            key={starCount}
            className="live-score-progress-milestone"
            style={{ left: `${percent}%` }}
          >
            <span
              className={[
                "live-score-progress-star",
                earned ? "live-score-progress-star--earned" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {earned ? "★" : "☆"}
            </span>
            <span className="live-score-progress-line" />
          </div>
        ))}
        <div className="live-score-progress-track">
          <div
            className={[
              "live-score-progress-fill",
              isPerfect ? "live-score-progress-fill--rainbow" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              {
                width: `${fillPercent}%`,
                "--bar-phase": barPhase,
              } as React.CSSProperties
            }
          />
        </div>
      </div>
    </div>
  );
}
