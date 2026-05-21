"use client";

import { useEffect, useRef, useState } from "react";

const FLY_DELAY_MS = 400;
const FLY_DURATION_MS = 700;
const POP_DURATION_MS = 400;

type RunningScoreProps = {
  score: number;
  pointsEarned: number | null;
  animId: number;
  flyFromRef: React.RefObject<HTMLElement | null>;
  onPointsApplied: () => void;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function RunningScore({
  score,
  pointsEarned,
  animId,
  flyFromRef,
  onPointsApplied,
}: RunningScoreProps) {
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
      const fromEl = flyFromRef.current;
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
      }, FLY_DURATION_MS);
    }, FLY_DELAY_MS);

    return () => {
      clearTimeout(flyTimer);
      clearTimeout(mergeTimer);
      setFlying(false);
    };
  }, [animId, pointsEarned, flyFromRef, onPointsApplied]);

  return (
    <>
      <p
        ref={targetRef}
        className={`text-accent shrink-0 text-2xl font-bold ${popping ? "score-total-pop" : ""}`}
        aria-live="polite"
      >
        {score}点
      </p>
      {flying && pointsEarned != null && (
        <span className="score-fly-badge" style={flyStyle} aria-hidden="true">
          +{pointsEarned}点
        </span>
      )}
    </>
  );
}
