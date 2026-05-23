"use client";

import { useEffect, useRef, useState } from "react";
import { getRemainingBonusSeconds, RED_ALERT_REMAINING_SECONDS } from "@/lib/time-attack-scoring";
import { SCORE_TIME_GRACE_SECONDS } from "@/lib/scoring";

type QuestionTimerProps = {
  timeLimitSeconds: number;
  questionKey: string;
  onTimeout: () => void;
  paused?: boolean;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function QuestionTimer({
  timeLimitSeconds,
  questionKey,
  onTimeout,
  paused = false,
}: QuestionTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startedAtRef = useRef<number>(0);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    startedAtRef.current = Date.now();

    if (paused) {
      return;
    }

    const interval = window.setInterval(() => {
      const nextElapsed = (Date.now() - startedAtRef.current) / 1000;
      setElapsedSeconds(nextElapsed);

      const remaining = getRemainingBonusSeconds(nextElapsed, timeLimitSeconds);
      if (remaining <= 0) {
        window.clearInterval(interval);
        onTimeoutRef.current();
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [questionKey, timeLimitSeconds, paused]);

  const remaining = getRemainingBonusSeconds(elapsedSeconds, timeLimitSeconds);
  const redAlert = remaining <= RED_ALERT_REMAINING_SECONDS && remaining > 0;
  const displayRemaining = Math.ceil(remaining);

  return (
    <div
      className={`question-timer ${redAlert ? "question-timer--red" : ""} ${prefersReducedMotion() && redAlert ? "question-timer--red-static" : ""}`}
      role="timer"
      aria-live="polite"
      aria-label={`残り${displayRemaining}秒`}
    >
      <span className="question-timer__label">残り</span>
      <span className="question-timer__value">{displayRemaining}</span>
      <span className="question-timer__unit">秒</span>
      {elapsedSeconds < SCORE_TIME_GRACE_SECONDS && (
        <span className="question-timer__grace">スタート！</span>
      )}
    </div>
  );
}
