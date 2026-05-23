"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export const EVIL_ORB_CHARGE_MS = 300;
export const EVIL_ORB_FLY_MS = 720;

type OrbFlight = {
  startX: number;
  startY: number;
  flyDx: number;
  flyDy: number;
};

type OniEvilOrbProps = {
  animId: number;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  onHit: () => void;
  onComplete: () => void;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function OniEvilOrb({ animId, fromRef, toRef, onHit, onComplete }: OniEvilOrbProps) {
  const processedAnimIdRef = useRef(0);
  const onHitRef = useRef(onHit);
  const onCompleteRef = useRef(onComplete);
  const [flight, setFlight] = useState<OrbFlight | null>(null);

  useEffect(() => {
    onHitRef.current = onHit;
    onCompleteRef.current = onComplete;
  }, [onHit, onComplete]);

  useEffect(() => {
    if (animId === 0 || processedAnimIdRef.current === animId) {
      return;
    }

    processedAnimIdRef.current = animId;

    const fromEl = fromRef.current;
    const toEl = toRef.current;
    if (!fromEl || !toEl) {
      onHitRef.current();
      onCompleteRef.current();
      return;
    }

    if (prefersReducedMotion()) {
      onHitRef.current();
      onCompleteRef.current();
      return;
    }

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const startX = fromRect.left + fromRect.width * 0.42;
    const startY = fromRect.top + fromRect.height * 0.48;
    const toX = toRect.left + toRect.width / 2;
    const toY = toRect.top + toRect.height * 0.55;

    setFlight({
      startX,
      startY,
      flyDx: toX - startX,
      flyDy: toY - startY,
    });

    const hitMs = EVIL_ORB_CHARGE_MS + EVIL_ORB_FLY_MS;
    const hitTimer = setTimeout(() => {
      onHitRef.current();
    }, hitMs);

    const completeTimer = setTimeout(() => {
      setFlight(null);
      onCompleteRef.current();
    }, hitMs + 120);

    return () => {
      clearTimeout(hitTimer);
      clearTimeout(completeTimer);
      setFlight(null);
    };
  }, [animId, fromRef, toRef]);

  if (!flight) {
    return null;
  }

  return (
    <div
      className="oni-evil-orb-layer"
      style={
        {
          ["--evil-charge-duration" as string]: `${EVIL_ORB_CHARGE_MS}ms`,
          ["--evil-fly-duration" as string]: `${EVIL_ORB_FLY_MS}ms`,
          ["--evil-fly-delay" as string]: `${EVIL_ORB_CHARGE_MS}ms`,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <span
        className="oni-evil-orb"
        style={
          {
            left: flight.startX,
            top: flight.startY,
            ["--fly-dx" as string]: `${flight.flyDx}px`,
            ["--fly-dy" as string]: `${flight.flyDy}px`,
          } as React.CSSProperties
        }
      />
      <span
        className="oni-evil-orb__trail"
        style={
          {
            left: flight.startX,
            top: flight.startY,
            ["--fly-dx" as string]: `${flight.flyDx}px`,
            ["--fly-dy" as string]: `${flight.flyDy}px`,
          } as React.CSSProperties
        }
      />
    </div>
  );
}
