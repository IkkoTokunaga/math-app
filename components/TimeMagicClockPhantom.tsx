"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";

/** 閻魔付近でゆらゆらする時間 */
export const TIME_MAGIC_CLOCK_WOBBLE_MS = 1100;
export const TIME_MAGIC_CLOCK_FLY_MS = 750;

type ClockFlight = {
  startX: number;
  startY: number;
  flyDx: number;
  flyDy: number;
  flyAngle: number;
};

type TimeMagicClockPhantomProps = {
  animId: number;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  onComplete: () => void;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function TimeMagicClockPhantom({
  animId,
  fromRef,
  toRef,
  onComplete,
}: TimeMagicClockPhantomProps) {
  const processedAnimIdRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const [flight, setFlight] = useState<ClockFlight | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (animId === 0 || processedAnimIdRef.current === animId) {
      return;
    }

    processedAnimIdRef.current = animId;

    const fromEl = fromRef.current;
    const toEl = toRef.current;
    if (!fromEl || !toEl) {
      onCompleteRef.current();
      return;
    }

    if (prefersReducedMotion()) {
      onCompleteRef.current();
      return;
    }

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const startX = fromRect.left + fromRect.width * 0.5;
    const startY = fromRect.top + fromRect.height * 0.38;
    const toX = toRect.left + toRect.width / 2;
    const toY = toRect.top + toRect.height / 2;
    const flyDx = toX - startX;
    const flyDy = toY - startY;

    setFlight({
      startX,
      startY,
      flyDx,
      flyDy,
      flyAngle: (Math.atan2(flyDy, flyDx) * 180) / Math.PI,
    });

    const totalMs = TIME_MAGIC_CLOCK_WOBBLE_MS + TIME_MAGIC_CLOCK_FLY_MS;
    const completeTimer = setTimeout(() => {
      setFlight(null);
      onCompleteRef.current();
    }, totalMs + 80);

    return () => {
      clearTimeout(completeTimer);
      setFlight(null);
    };
  }, [animId, fromRef, toRef]);

  if (!flight) {
    return null;
  }

  const wrapStyle: CSSProperties = {
    left: flight.startX,
    top: flight.startY,
    ["--fly-dx" as string]: `${flight.flyDx}px`,
    ["--fly-dy" as string]: `${flight.flyDy}px`,
    ["--fly-angle" as string]: `${flight.flyAngle}deg`,
  };

  return (
    <div
      className="time-magic-clock-layer"
      style={
        {
          ["--clock-wobble-duration" as string]: `${TIME_MAGIC_CLOCK_WOBBLE_MS}ms`,
          ["--clock-fly-duration" as string]: `${TIME_MAGIC_CLOCK_FLY_MS}ms`,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <div className="time-magic-clock-wrap" style={wrapStyle}>
        <div className="time-magic-clock-body">
          <span className="time-magic-clock__trail" />
          <span className="time-magic-clock__glow" />
          <span className="time-magic-clock__face">
            <span className="time-magic-clock__hand time-magic-clock__hand--hour" />
            <span className="time-magic-clock__hand time-magic-clock__hand--minute" />
            <span className="time-magic-clock__center" />
          </span>
        </div>
      </div>
    </div>
  );
}
