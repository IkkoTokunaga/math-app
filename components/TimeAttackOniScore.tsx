"use client";

import { useEffect, useRef, useState } from "react";
import {
  SCORE_FLY_DELAY_MS,
  SCORE_FLY_DURATION_MS,
} from "@/components/RunningScore";

const POP_DURATION_MS = 400;

type TimeAttackOniScoreProps = {
  score: number;
  pointsEarned: number | null;
  flyLabel: string | null;
  flyDelayMs?: number;
  flyDurationMs?: number;
  animId: number;
  getFlyFromElement: () => HTMLElement | null;
  onPointsApplied: () => void;
  hpHit?: boolean;
  layout?: "combined" | "split";
  meta?: React.ReactNode;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function TimeAttackOniScore({
  score,
  pointsEarned,
  flyLabel,
  flyDelayMs = SCORE_FLY_DELAY_MS,
  flyDurationMs = SCORE_FLY_DURATION_MS,
  animId,
  getFlyFromElement,
  onPointsApplied,
  hpHit = false,
  layout = "combined",
  meta = null,
}: TimeAttackOniScoreProps) {
  const targetRef = useRef<HTMLParagraphElement>(null);
  const processedAnimIdRef = useRef(0);
  const [flying, setFlying] = useState(false);
  const [flyStyle, setFlyStyle] = useState<React.CSSProperties>({});
  const [popping, setPopping] = useState(false);

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

  const scoreEl = (
    <p
      ref={targetRef}
      className={`time-attack-oni-score__points ${popping ? "time-attack-oni-score__points--pop" : ""}`}
      aria-live="polite"
    >
      {score}点
    </p>
  );

  const oniEl = (
    <img
      src="/oni.png"
      alt=""
      className="time-attack-oni-score__image"
    />
  );

  if (layout === "split") {
    return (
      <>
        <div className="time-attack-top__stats pointer-events-none">
          {scoreEl}
          {meta}
        </div>
        <div
          className={`time-attack-top__oni time-attack-oni-score ${hpHit ? "time-attack-oni-score--hit" : ""}`}
        >
          {oniEl}
        </div>
        {flying && flyLabel != null && (
          <span
            className="score-fly-badge"
            style={
              {
                ...flyStyle,
                ["--fly-duration" as string]: `${flyDurationMs}ms`,
              } as React.CSSProperties
            }
            aria-hidden="true"
          >
            {flyLabel}
          </span>
        )}
      </>
    );
  }

  return (
    <>
      <div
        className={`time-attack-oni-score ${hpHit ? "time-attack-oni-score--hit" : ""}`}
      >
        {oniEl}
        {scoreEl}
      </div>
      {flying && flyLabel != null && (
        <span
          className="score-fly-badge"
          style={
            {
              ...flyStyle,
              ["--fly-duration" as string]: `${flyDurationMs}ms`,
            } as React.CSSProperties
          }
          aria-hidden="true"
        >
          {flyLabel}
        </span>
      )}
    </>
  );
}
