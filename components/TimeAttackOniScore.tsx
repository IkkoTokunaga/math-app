"use client";

import { useEffect, useRef, useState, type RefObject, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/use-is-client";
import type { OniPhase } from "@/components/MascotLightOrb";
import {
  SCORE_FLY_DELAY_MS,
  SCORE_FLY_DURATION_MS,
} from "@/components/RunningScore";
import { useAnimatedScore } from "@/lib/use-animated-score";
import type { Level } from "@/lib/questions";
import { DEFAULT_OPERATION, type Operation } from "@/lib/operations";
import { getBossImagePresentation } from "@/lib/time-attack-boss-visual";
import { isEnmaBoss } from "@/lib/time-attack";

const POP_DURATION_MS = 400;

type TimeAttackOniScoreProps = {
  score: number;
  pointsEarned: number | null;
  flyLabel: string | null;
  flyDelayMs?: number;
  flyDurationMs?: number;
  flyClassName?: string;
  animId: number;
  getFlyFromElement: () => HTMLElement | null;
  onPointsApplied: () => void;
  oniPhase?: OniPhase;
  oniRef?: RefObject<HTMLDivElement | null>;
  isSpecial?: boolean;
  bossKey?: string;
  currentLevel?: Level;
  operation?: Operation;
  layout?: "combined" | "split";
  meta?: React.ReactNode;
  onEnterAnimationComplete?: () => void;
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
  flyClassName = "",
  animId,
  getFlyFromElement,
  onPointsApplied,
  oniPhase = "idle",
  oniRef,
  isSpecial = false,
  bossKey = "oni",
  currentLevel = 1,
  operation = DEFAULT_OPERATION,
  layout = "combined",
  meta = null,
  onEnterAnimationComplete,
}: TimeAttackOniScoreProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const processedAnimIdRef = useRef(0);
  const [flying, setFlying] = useState(false);
  const [flyStyle, setFlyStyle] = useState<CSSProperties>({});
  const [popping, setPopping] = useState(false);
  const [pulse, setPulse] = useState(false);
  const displayScore = useAnimatedScore(score);
  const isClient = useIsClient();

  useEffect(() => {
    if (score > 0) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 400);
      return () => clearTimeout(timer);
    }
  }, [score]);

  const flyBadge =
    isClient && flying && flyLabel != null
      ? createPortal(
          <span
            className={`score-fly-badge ${flyClassName}`.trim()}
            style={
              {
                ...flyStyle,
                ["--fly-duration" as string]: `${flyDurationMs}ms`,
              } as CSSProperties
            }
            aria-hidden="true"
          >
            {flyLabel}
          </span>,
          document.body,
        )
      : null;

  const showOni = oniPhase !== "hidden";
  const phaseClass = oniPhaseClass(oniPhase);

  useEffect(() => {
    if (oniPhase !== "entering" || !onEnterAnimationComplete) {
      return;
    }

    let settled = false;
    const settle = () => {
      if (settled) {
        return;
      }
      settled = true;
      onEnterAnimationComplete();
    };

    const reduced = prefersReducedMotion();
    const img = oniRef?.current?.querySelector<HTMLElement>(".time-attack-oni-score__image");
    if (!img || reduced) {
      settle();
      return;
    }

    const handleAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName === "oni-body-enter") {
        settle();
      }
    };

    img.addEventListener("animationend", handleAnimationEnd);
    const fallback = setTimeout(settle, 560);

    return () => {
      img.removeEventListener("animationend", handleAnimationEnd);
      clearTimeout(fallback);
    };
  }, [bossKey, onEnterAnimationComplete, oniPhase, oniRef]);

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
    <div
      ref={targetRef}
      className={`neon-scoreboard ${pulse ? "neon-scoreboard--pulse" : ""}`}
      aria-label={`合計得点: ${score}点`}
    >
      <span className="neon-scoreboard__label">SCORE</span>
      <div className="neon-scoreboard__score-wrap">
        <span className="neon-scoreboard__score">
          {displayScore.toLocaleString("ja-JP")}
        </span>
        <span className="neon-scoreboard__unit">点</span>
      </div>
    </div>
  );

  const bossImage = getBossImagePresentation(currentLevel, operation);
  const enmaOp = isEnmaBoss(currentLevel);
  const oniBody = showOni ? (
    <img
      key={bossKey}
      src={bossImage.src}
      alt=""
      className={bossImage.className}
      style={bossImage.style}
    />
  ) : null;

  const oniWrap = (
    <div
      ref={oniRef}
      className={`time-attack-top__oni time-attack-oni-score ${operation === "subtraction" ? "time-attack-oni-score--subtraction-op" : ""} ${enmaOp ? "time-attack-oni-score--enma-op" : ""} ${phaseClass}`.trim()}
    >
      {oniBody}
      {oniPhase === "shaking" && isSpecial && (
        <div className="oni-special-hit-rainbow" aria-hidden="true">
          <span className="oni-special-hit-rainbow__ring" />
          <span className="oni-special-hit-rainbow__flash" />
          <svg className="oni-special-hit-rainbow__sparkle oni-special-hit-rainbow__sparkle--1" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z" fill="currentColor" />
          </svg>
          <svg className="oni-special-hit-rainbow__sparkle oni-special-hit-rainbow__sparkle--2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z" fill="currentColor" />
          </svg>
          <svg className="oni-special-hit-rainbow__sparkle oni-special-hit-rainbow__sparkle--3" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z" fill="currentColor" />
          </svg>
          <svg className="oni-special-hit-rainbow__sparkle oni-special-hit-rainbow__sparkle--4" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z" fill="currentColor" />
          </svg>
        </div>
      )}
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
        {flyBadge}
      </>
    );
  }

  return (
    <>
      <div className={`time-attack-oni-score ${phaseClass}`.trim()}>
        {oniBody}
        {scoreEl}
      </div>
      {flyBadge}
    </>
  );
}
