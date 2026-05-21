"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  STAR_COUNT,
  calculateMaxPossibleSessionScore,
  getStarProgressInfo,
  renderStars,
} from "@/lib/scoring";
import { QUESTIONS_PER_SESSION, type Level } from "@/lib/questions";

const ANIMATION_DURATION_MS = 2200;
const SPARKLE_START_DELAY_MS = 800;

type StarProgressBarProps = {
  level: Level;
  totalScore: number;
  totalQuestions?: number;
};

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function getVisibleStarCount(progress: number, targetStars: number): number {
  if (targetStars <= 0) {
    return 0;
  }
  let count = 0;
  for (let i = 1; i <= targetStars; i += 1) {
    if (progress >= i / targetStars - 0.0001) {
      count = i;
    }
  }
  return count;
}

function subscribeReducedMotion(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type AnimatedStarProps = {
  earned: boolean;
  popping: boolean;
  isLastEarned: boolean;
  sparkling: boolean;
  sparkleDelay: number;
};

function AnimatedStar({
  earned,
  popping,
  isLastEarned,
  sparkling,
  sparkleDelay,
}: AnimatedStarProps) {
  const popClass =
    popping && isLastEarned
      ? "star-display-icon--pop-final"
      : popping
        ? "star-display-icon--pop"
        : "";

  return (
    <span className={`star-display-slot ${sparkling ? "star-display-slot--sparkle" : ""}`}>
      {sparkling && (
        <>
          <span
            className="star-sparkle-particle star-sparkle-particle--a"
            style={{ animationDelay: `${sparkleDelay}s` }}
            aria-hidden="true"
          />
          <span
            className="star-sparkle-particle star-sparkle-particle--b"
            style={{ animationDelay: `${sparkleDelay + 0.35}s` }}
            aria-hidden="true"
          />
          <span
            className="star-sparkle-particle star-sparkle-particle--c"
            style={{ animationDelay: `${sparkleDelay + 0.7}s` }}
            aria-hidden="true"
          />
          <span
            className="star-sparkle-glyph star-sparkle-glyph--a"
            style={{ animationDelay: `${sparkleDelay + 0.15}s` }}
            aria-hidden="true"
          >
            ✦
          </span>
          <span
            className="star-sparkle-glyph star-sparkle-glyph--b"
            style={{ animationDelay: `${sparkleDelay + 0.5}s` }}
            aria-hidden="true"
          >
            ✦
          </span>
        </>
      )}
      <span
        className={[
          "star-display-icon",
          earned ? "star-display-icon--earned" : "star-display-icon--empty",
          sparkling ? "star-display-icon--sparkle" : "",
          popClass,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      >
        {earned ? "★" : "☆"}
      </span>
    </span>
  );
}

type StarProgressBarAnimatedProps = StarProgressBarProps & {
  prefersReducedMotion: boolean;
};

function StarProgressBarAnimated({
  level,
  totalScore,
  totalQuestions = QUESTIONS_PER_SESSION,
  prefersReducedMotion,
}: StarProgressBarAnimatedProps) {
  const maxPossibleScore = calculateMaxPossibleSessionScore(level, totalQuestions);
  const { stars, nextStars, pointsToNextStar, tierProgressPercent } = getStarProgressInfo(
    totalScore,
    maxPossibleScore,
  );
  const targetBarPercent = nextStars === null ? 100 : tierProgressPercent;

  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [sparkleActive, setSparkleActive] = useState(false);
  const [poppingIndex, setPoppingIndex] = useState<number | null>(null);
  const previousVisibleStars = useRef(0);
  const sparkleTimerRef = useRef<number | null>(null);

  const effectiveProgress = prefersReducedMotion ? 1 : progress;
  const effectiveDone = prefersReducedMotion || done;
  const visibleStars = getVisibleStarCount(effectiveProgress, stars);
  const isPerfectScore = stars >= STAR_COUNT;
  const showSparkle =
    isPerfectScore && (prefersReducedMotion ? effectiveDone : sparkleActive);
  const showRainbowBar = isPerfectScore && effectiveDone;
  const barWidth = effectiveProgress * targetBarPercent;
  const barFillClassName = [
    "star-progress-fill",
    showRainbowBar ? "star-progress-fill--rainbow" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const barFillStyle = {
    width: `${barWidth}%`,
    "--bar-phase": effectiveDone ? 1 : effectiveProgress,
  } as React.CSSProperties;

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    previousVisibleStars.current = 0;
    if (sparkleTimerRef.current !== null) {
      window.clearTimeout(sparkleTimerRef.current);
      sparkleTimerRef.current = null;
    }

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / ANIMATION_DURATION_MS);
      setProgress(easeOutCubic(t));

      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setDone(true);
        if (stars >= STAR_COUNT) {
          sparkleTimerRef.current = window.setTimeout(() => {
            setSparkleActive(true);
            sparkleTimerRef.current = null;
          }, SPARKLE_START_DELAY_MS);
        }
      }
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      if (sparkleTimerRef.current !== null) {
        window.clearTimeout(sparkleTimerRef.current);
        sparkleTimerRef.current = null;
      }
    };
  }, [prefersReducedMotion, stars]);

  useEffect(() => {
    if (visibleStars > previousVisibleStars.current) {
      const earnedIndex = visibleStars - 1;
      setPoppingIndex(earnedIndex);
      previousVisibleStars.current = visibleStars;
      const isLastEarnedStar = earnedIndex === stars - 1;
      const timer = window.setTimeout(
        () => setPoppingIndex(null),
        isLastEarnedStar ? 800 : 450,
      );
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [visibleStars, stars]);

  return (
    <div className="star-progress-display">
      <div
        className={`star-display text-5xl ${showSparkle ? "star-display--perfect" : ""}`}
        aria-label={`星 ${visibleStars} / ${STAR_COUNT}`}
      >
        {Array.from({ length: STAR_COUNT }, (_, index) => (
          <AnimatedStar
            key={index}
            earned={index < visibleStars}
            popping={index === poppingIndex}
            isLastEarned={stars > 0 && index === stars - 1}
            sparkling={showSparkle && index < STAR_COUNT}
            sparkleDelay={index * 0.18}
          />
        ))}
      </div>

      {nextStars === null ? (
        <div className="star-progress mt-4">
          <p
            className={`star-progress-message text-success text-base font-bold ${effectiveDone ? "star-progress-message--visible" : ""}`}
          >
            最高の星！ おめでとう！
          </p>
          <div className="star-progress-track mt-2">
            <div className={barFillClassName} style={barFillStyle} />
          </div>
        </div>
      ) : (
        <div className="star-progress mt-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted">{renderStars(stars)}</span>
            <span className="text-muted">{renderStars(nextStars)}</span>
          </div>
          <div className="star-progress-track">
            <div className={barFillClassName} style={barFillStyle} />
          </div>
          <p
            className={`star-progress-message mt-2 text-base ${effectiveDone ? "star-progress-message--visible" : ""}`}
          >
            あと{" "}
            <span className="text-accent font-bold">{pointsToNextStar}点</span> で{" "}
            {renderStars(nextStars)}
          </p>
        </div>
      )}
    </div>
  );
}

export function StarProgressBar({ level, totalScore, totalQuestions }: StarProgressBarProps) {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );

  return (
    <StarProgressBarAnimated
      key={`${level}-${totalScore}-${totalQuestions ?? QUESTIONS_PER_SESSION}-${prefersReducedMotion}`}
      level={level}
      totalScore={totalScore}
      totalQuestions={totalQuestions}
      prefersReducedMotion={prefersReducedMotion}
    />
  );
}
