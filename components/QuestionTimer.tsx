"use client";

import { useEffect, useRef, useState } from "react";
import { getRemainingBonusSeconds, RED_ALERT_REMAINING_SECONDS } from "@/lib/time-attack-scoring";
import { SCORE_TIME_GRACE_SECONDS } from "@/lib/scoring";

type QuestionTimerProps = {
  timeLimitSeconds: number;
  questionKey: string;
  paused?: boolean;
  variant?: "bar" | "ring";
  className?: string;
};

const RING_SIZE = 44;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function QuestionTimer({
  timeLimitSeconds,
  questionKey,
  paused = false,
  variant = "bar",
  className = "",
}: QuestionTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bonusExpired, setBonusExpired] = useState(false);
  const startedAtRef = useRef<number>(0);

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
        setBonusExpired(true);
        window.clearInterval(interval);
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [questionKey, timeLimitSeconds, paused]);

  const remaining = getRemainingBonusSeconds(elapsedSeconds, timeLimitSeconds);
  const redAlert = !bonusExpired && remaining <= RED_ALERT_REMAINING_SECONDS && remaining > 0;
  const displayRemaining = bonusExpired ? 0 : Math.ceil(remaining);
  const ringProgress =
    timeLimitSeconds > 0 ? Math.max(0, Math.min(1, remaining / timeLimitSeconds)) : 0;
  const ringOffset = RING_CIRCUMFERENCE * (1 - ringProgress);
  const inGrace = !bonusExpired && elapsedSeconds < SCORE_TIME_GRACE_SECONDS;

  if (variant === "ring") {
    return (
      <div
        className={`question-timer question-timer--ring ${redAlert ? "question-timer--red" : ""} ${bonusExpired ? "question-timer--expired" : ""} ${prefersReducedMotion() && redAlert ? "question-timer--red-static" : ""} ${className}`.trim()}
        role="timer"
        aria-live="polite"
        aria-label={
          bonusExpired ? "ボーナスなし（基本点のみ）" : `残り${displayRemaining}秒`
        }
      >
        <svg
          className="question-timer__ring-svg"
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          aria-hidden="true"
        >
          <circle
            className="question-timer__ring-track"
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
          />
          <circle
            className="question-timer__ring-fill"
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={bonusExpired ? RING_CIRCUMFERENCE : ringOffset}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </svg>
        <span className="question-timer__ring-value">
          {bonusExpired ? "0" : inGrace ? "GO" : displayRemaining}
        </span>
        {bonusExpired && (
          <span className="question-timer__expired-label">ボーナスなし（基本点のみ）</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`question-timer ${redAlert ? "question-timer--red" : ""} ${bonusExpired ? "question-timer--expired" : ""} ${prefersReducedMotion() && redAlert ? "question-timer--red-static" : ""} ${className}`.trim()}
      role="timer"
      aria-live="polite"
      aria-label={
        bonusExpired ? "ボーナスなし（基本点のみ）" : `残り${displayRemaining}秒`
      }
    >
      <span className="question-timer__label">残り</span>
      <span className="question-timer__value">{displayRemaining}</span>
      <span className="question-timer__unit">秒</span>
      {inGrace && <span className="question-timer__grace">スタート！</span>}
      {bonusExpired && (
        <span className="question-timer__expired-label">ボーナスなし（基本点のみ）</span>
      )}
    </div>
  );
}
