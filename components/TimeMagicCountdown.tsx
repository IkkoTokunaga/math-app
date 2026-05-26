"use client";

import { TIME_MAGIC_COUNTDOWN_SECONDS } from "@/lib/time-attack-magic";

const RING_RADIUS = 18;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type TimeMagicCountdownProps = {
  secondsRemaining: number;
};

export function TimeMagicCountdown({ secondsRemaining }: TimeMagicCountdownProps) {
  const clamped = Math.max(0, Math.min(TIME_MAGIC_COUNTDOWN_SECONDS, secondsRemaining));
  const progress = clamped / TIME_MAGIC_COUNTDOWN_SECONDS;
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);
  const displaySeconds = Math.max(0, Math.ceil(clamped));
  const isUrgent = clamped <= 3 && clamped > 0;

  return (
    <div
      className={`question-timer question-timer--ring question-timer--board time-magic-countdown--enter ${isUrgent ? "question-timer--red question-timer--red-static" : ""}`}
      role="timer"
      aria-live="polite"
      aria-label={`時間の魔法 ${displaySeconds}秒`}
    >
      <svg
        className="question-timer__ring-svg"
        width="44"
        height="44"
        viewBox="0 0 44 44"
        aria-hidden="true"
      >
        <circle
          className="question-timer__ring-track"
          cx="22"
          cy="22"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="4"
        />
        <circle
          className="question-timer__ring-fill"
          cx="22"
          cy="22"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="4"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 22 22)"
        />
      </svg>
      <span className="question-timer__ring-value">{displaySeconds}</span>
      <span className="question-timer__expired-label">時間の魔法</span>
    </div>
  );
}
