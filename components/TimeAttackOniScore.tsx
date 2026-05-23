"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { OniPhase } from "@/components/MascotBeam";
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
  oniPhase?: OniPhase;
  oniRef?: RefObject<HTMLDivElement | null>;
  bossKey?: string;
  layout?: "combined" | "split";
  meta?: React.ReactNode;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function oniPhaseClass(phase: OniPhase): string {
  switch (phase) {
    case "shaking":
      return "time-attack-oni-score--shake";
    case "exploding":
      return "time-attack-oni-score--exploding";
    case "entering":
      return "time-attack-oni-score--enter";
    default:
      return "";
  }
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
  oniPhase = "idle",
  oniRef,
  bossKey = "oni",
  layout = "combined",
  meta = null,
}: TimeAttackOniScoreProps) {
  const targetRef = useRef<HTMLParagraphElement>(null);
  const processedAnimIdRef = useRef(0);
  const [flying, setFlying] = useState(false);
  const [flyStyle, setFlyStyle] = useState<React.CSSProperties>({});
  const [popping, setPopping] = useState(false);

  const showOni = oniPhase !== "hidden";
  const phaseClass = oniPhaseClass(oniPhase);

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

  const oniBody = showOni ? (
    <img
      key={bossKey}
      src="/oni.png"
      alt=""
      className="time-attack-oni-score__image"
    />
  ) : null;

  const oniWrap = (
    <div
      ref={oniRef}
      className={`time-attack-top__oni time-attack-oni-score ${phaseClass}`.trim()}
    >
      {oniBody}
      {oniPhase === "exploding" && (
        <div className="oni-explosion" aria-hidden="true">
          <span className="oni-explosion__ring" />
          <span className="oni-explosion__flash" />
          <span className="oni-explosion__particle oni-explosion__particle--1" />
          <span className="oni-explosion__particle oni-explosion__particle--2" />
          <span className="oni-explosion__particle oni-explosion__particle--3" />
          <span className="oni-explosion__particle oni-explosion__particle--4" />
          <span className="oni-explosion__particle oni-explosion__particle--5" />
          <span className="oni-explosion__particle oni-explosion__particle--6" />
        </div>
      )}
    </div>
  );

  if (layout === "split") {
    return (
      <>
        <div className="time-attack-top__stats pointer-events-none">
          {scoreEl}
          {meta}
        </div>
        {oniWrap}
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
      <div className={`time-attack-oni-score ${phaseClass}`.trim()}>
        {oniBody}
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
