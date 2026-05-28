"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/use-is-client";
import { useAnimatedScore } from "@/lib/use-animated-score";

export const SCORE_FLY_DELAY_MS = 400;
export const SCORE_FLY_DURATION_MS = 700;
export const SCORE_ANIM_STEP_MS = SCORE_FLY_DELAY_MS + SCORE_FLY_DURATION_MS;

const POP_DURATION_MS = 400;

type RunningScoreProps = {
  score: number;
  pointsEarned: number | null;
  flyLabel: string | null;
  flyDelayMs?: number;
  flyDurationMs?: number;
  flyClassName?: string;
  animId: number;
  getFlyFromElement: () => HTMLElement | null;
  onPointsApplied: () => void;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function RunningScore({
  score,
  pointsEarned,
  flyLabel,
  flyDelayMs = SCORE_FLY_DELAY_MS,
  flyDurationMs = SCORE_FLY_DURATION_MS,
  flyClassName = "",
  animId,
  getFlyFromElement,
  onPointsApplied,
}: RunningScoreProps) {
  const targetRef = useRef<HTMLParagraphElement>(null);
  const processedAnimIdRef = useRef(0);
  const [flying, setFlying] = useState(false);
  const [flyStyle, setFlyStyle] = useState<React.CSSProperties>({});
  const [popping, setPopping] = useState(false);
  const displayScore = useAnimatedScore(score);
  const isClient = useIsClient();

  useEffect(() => {
    if (pointsEarned == null || pointsEarned <= 0 || animId === 0) {
      return;
    }

    if (processedAnimIdRef.current === animId) {
      return;
    }

    processedAnimIdRef.current = animId;

    if (prefersReducedMotion()) {
      onPointsApplied();
      setPopping(true);
      const popTimer = setTimeout(() => setPopping(false), POP_DURATION_MS);
      return () => clearTimeout(popTimer);
    }

    let mergeTimer: ReturnType<typeof setTimeout>;

    const flyTimer = setTimeout(() => {
      const fromEl = getFlyFromElement();
      const toEl = targetRef.current;
      if (!fromEl || !toEl) {
        onPointsApplied();
        setPopping(true);
        setTimeout(() => setPopping(false), POP_DURATION_MS);
        return;
      }

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      const fromX = fromRect.left + fromRect.width / 2;
      const fromY = fromRect.top + fromRect.height / 2;
      const toX = toRect.left + toRect.width / 2;
      const toY = toRect.top + toRect.height / 2;

      setFlyStyle({
        left: fromX,
        top: fromY,
        ["--fly-dx" as string]: `${toX - fromX}px`,
        ["--fly-dy" as string]: `${toY - fromY}px`,
      });
      setFlying(true);

      mergeTimer = setTimeout(() => {
        setFlying(false);
        onPointsApplied();
        setPopping(true);
        setTimeout(() => setPopping(false), POP_DURATION_MS);
      }, flyDurationMs);
    }, flyDelayMs);

    return () => {
      clearTimeout(flyTimer);
      clearTimeout(mergeTimer);
      setFlying(false);
    };
  }, [animId, flyDelayMs, flyDurationMs, getFlyFromElement, onPointsApplied, pointsEarned]);

  return (
    <>
      <p
        ref={targetRef}
        className={`text-accent shrink-0 text-2xl font-bold ${popping ? "score-total-pop" : ""}`}
        aria-live="polite"
      >
        {displayScore}点
      </p>
      {isClient &&
        flying &&
        flyLabel != null &&
        createPortal(
          <span
            className={`score-fly-badge ${flyClassName}`.trim()}
            style={
              {
                ...flyStyle,
                ["--fly-duration" as string]: `${flyDurationMs}ms`,
              } as React.CSSProperties
            }
            aria-hidden="true"
          >
            {flyLabel}
          </span>,
          document.body,
        )}
    </>
  );
}
