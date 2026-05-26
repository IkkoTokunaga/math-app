"use client";

import { useEffect, useRef, useState } from "react";
import { playScoreCountTick } from "@/lib/keypad-sounds";

export const SCORE_COUNT_UP_MIN_MS = 280;
export const SCORE_COUNT_UP_MAX_MS = 750;
export const SCORE_COUNT_UP_MS_PER_POINT = 45;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function getCountUpDurationMs(delta: number): number {
  return Math.min(
    SCORE_COUNT_UP_MAX_MS,
    Math.max(SCORE_COUNT_UP_MIN_MS, delta * SCORE_COUNT_UP_MS_PER_POINT),
  );
}

export function useAnimatedScore(score: number): number {
  const [displayScore, setDisplayScore] = useState(score);
  const displayRef = useRef(score);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    displayRef.current = displayScore;
  }, [displayScore]);

  useEffect(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const from = displayRef.current;
    const to = score;

    if (from === to) {
      return;
    }

    if (to < from || prefersReducedMotion()) {
      displayRef.current = to;
      setDisplayScore(to);
      return;
    }

    const delta = to - from;
    const durationMs = getCountUpDurationMs(delta);
    let startTime: number | null = null;
    let lastTickValue = from;
    let tickIndex = 0;

    const tick = (now: number) => {
      if (startTime == null) {
        startTime = now;
      }

      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(progress);
      const current = Math.round(from + delta * eased);

      if (current !== lastTickValue) {
        playScoreCountTick(tickIndex);
        tickIndex += 1;
        lastTickValue = current;
      }

      displayRef.current = current;
      setDisplayScore(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      displayRef.current = to;
      setDisplayScore(to);
      rafRef.current = null;
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [score]);

  return displayScore;
}
