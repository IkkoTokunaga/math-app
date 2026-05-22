"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  STAR_COUNT,
  calculateMaxPossibleSessionScore,
  calculateStars,
  getStarScoreThreshold,
} from "@/lib/scoring";
import { QUESTIONS_PER_SESSION, type Level } from "@/lib/questions";

const BAR_ANIMATION_DURATION_MS = 650;
const COMPLETION_BAR_FILL_MS = 1000;
const STAR_POP_DURATION_MS = 450;
const STAR_POP_FINAL_DURATION_MS = 800;

export { COMPLETION_BAR_FILL_MS };

type LiveScoreProgressBarProps = {
  level: Level;
  totalScore: number;
  totalQuestions?: number;
  /** 最終問題で星5を取ったとき、得点比率ではなくバー右端（100%）まで伸ばす */
  fillToEnd?: boolean;
};

function getThresholdPercent(threshold: number, maxPossibleScore: number): number {
  return maxPossibleScore > 0 ? Math.min(100, (threshold / maxPossibleScore) * 100) : 0;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function subscribeReducedMotion(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type LiveScoreProgressBarAnimatedProps = LiveScoreProgressBarProps & {
  prefersReducedMotion: boolean;
};

function LiveScoreProgressBarAnimated({
  level,
  totalScore,
  totalQuestions = QUESTIONS_PER_SESSION,
  fillToEnd = false,
  prefersReducedMotion,
}: LiveScoreProgressBarAnimatedProps) {
  const maxPossibleScore = calculateMaxPossibleSessionScore(level, totalQuestions);
  const targetStars = calculateStars(totalScore, maxPossibleScore);
  const isPerfect = targetStars >= STAR_COUNT;
  const scoreFillPercent = getThresholdPercent(totalScore, maxPossibleScore);
  const targetFillPercent = fillToEnd && isPerfect ? 100 : scoreFillPercent;

  const committedFillRef = useRef(0);
  const currentFillRef = useRef(0);
  const previousEarnedRef = useRef<boolean[]>(Array(STAR_COUNT).fill(false));

  const [committedFillPercent, setCommittedFillPercent] = useState(0);
  const [animFromFill, setAnimFromFill] = useState(0);
  const [animProgress, setAnimProgress] = useState(1);
  const [done, setDone] = useState(true);
  const [poppingStar, setPoppingStar] = useState<number | null>(null);

  const isAnimating = !prefersReducedMotion && animProgress < 1;
  const displayFillPercent = prefersReducedMotion
    ? targetFillPercent
    : totalScore === 0 && !fillToEnd
      ? 0
      : isAnimating
        ? animFromFill + (targetFillPercent - animFromFill) * easeOutCubic(animProgress)
        : committedFillPercent;

  const displayStars = calculateStars(totalScore, maxPossibleScore);
  const effectiveDone = prefersReducedMotion || done;
  const barPhase = Math.min(1, displayFillPercent / 100);
  const barFullyExtended = displayFillPercent >= 99.9 && effectiveDone;
  const showRainbowBar = isPerfect && barFullyExtended && fillToEnd;

  const milestones = useMemo(
    () =>
      Array.from({ length: STAR_COUNT }, (_, index) => {
        const starCount = index + 1;
        const isFinalStar = starCount === STAR_COUNT;
        const threshold = getStarScoreThreshold(starCount, maxPossibleScore);
        const earned = isFinalStar
          ? isPerfect && barFullyExtended
          : displayStars >= starCount;

        return {
          starCount,
          percent: isFinalStar ? 100 : getThresholdPercent(threshold, maxPossibleScore),
          isFinalStar,
          showLine: !isFinalStar,
          earned,
        };
      }),
    [barFullyExtended, displayStars, isPerfect, maxPossibleScore],
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      committedFillRef.current = targetFillPercent;
      currentFillRef.current = targetFillPercent;
      return;
    }

    if (totalScore === 0 && !fillToEnd) {
      committedFillRef.current = 0;
      currentFillRef.current = 0;
      return;
    }

    const fromFill = currentFillRef.current;
    if (fromFill === targetFillPercent) {
      return;
    }

    const startFill = fromFill;
    const duration = fillToEnd ? COMPLETION_BAR_FILL_MS : BAR_ANIMATION_DURATION_MS;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const fill = startFill + (targetFillPercent - startFill) * easeOutCubic(t);
      currentFillRef.current = fill;
      setAnimFromFill(startFill);
      setAnimProgress(t);

      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        committedFillRef.current = targetFillPercent;
        currentFillRef.current = targetFillPercent;
        setCommittedFillPercent(targetFillPercent);
        setAnimProgress(1);
        setDone(true);
      }
    };

    setDone(false);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [fillToEnd, prefersReducedMotion, targetFillPercent, totalScore]);

  useEffect(() => {
    let poppedStar: number | null = null;

    milestones.forEach(({ starCount, earned }) => {
      const index = starCount - 1;
      if (earned && !previousEarnedRef.current[index]) {
        poppedStar = starCount;
      }
      previousEarnedRef.current[index] = earned;
    });

    if (poppedStar == null) {
      return undefined;
    }

    setPoppingStar(poppedStar);
    const duration =
      poppedStar === STAR_COUNT ? STAR_POP_FINAL_DURATION_MS : STAR_POP_DURATION_MS;
    const timer = window.setTimeout(() => setPoppingStar(null), duration);
    return () => window.clearTimeout(timer);
  }, [milestones]);

  return (
    <div className="live-score-progress-bar" aria-hidden="true">
      <div className="live-score-progress-frame">
        {milestones.map(({ starCount, percent, isFinalStar, showLine, earned }) => (
          <div
            key={starCount}
            className={[
              "live-score-progress-milestone",
              isFinalStar ? "live-score-progress-milestone--end" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ left: `${percent}%` }}
          >
            <span className="live-score-progress-star-slot">
              <span
                className={[
                  "live-score-progress-star",
                  earned ? "live-score-progress-star--earned" : "",
                  poppingStar === starCount
                    ? isFinalStar
                      ? "live-score-progress-star--pop-final"
                      : "live-score-progress-star--pop"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {earned ? "★" : "☆"}
              </span>
            </span>
            {showLine && <span className="live-score-progress-line" />}
          </div>
        ))}
        <div className="live-score-progress-track">
          <div
            className={[
              "live-score-progress-fill",
              showRainbowBar ? "live-score-progress-fill--rainbow" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              {
                width: `${displayFillPercent}%`,
                "--bar-phase": barPhase,
              } as React.CSSProperties
            }
          />
        </div>
      </div>
    </div>
  );
}

export function LiveScoreProgressBar({
  level,
  totalScore,
  totalQuestions,
  fillToEnd,
}: LiveScoreProgressBarProps) {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );

  return (
    <LiveScoreProgressBarAnimated
      key={`${level}-${totalQuestions ?? QUESTIONS_PER_SESSION}-${prefersReducedMotion}`}
      level={level}
      totalScore={totalScore}
      totalQuestions={totalQuestions}
      fillToEnd={fillToEnd}
      prefersReducedMotion={prefersReducedMotion}
    />
  );
}
