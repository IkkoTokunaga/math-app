"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/use-is-client";

export const LIGHT_ORB_FLY_MS = 720;

export type OniPhase = "idle" | "shaking" | "exploding" | "hidden" | "entering";

type OrbFlight = {
  startX: number;
  startY: number;
  flyDx: number;
  flyDy: number;
  flyAngle: number;
};

type MascotLightOrbProps = {
  animId: number;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  onComplete: () => void;
};

const SPARKLE_ORBITS = Array.from({ length: 14 }, (_, index) => ({
  radius: 1.55 + (index % 5) * 0.38,
  duration: 0.48 + (index % 6) * 0.11,
  delay: index * 35,
  symbol: index % 4 === 0 ? "✦" : index % 2 === 0 ? "✧" : "·",
}));

const DOT_ORBITS = Array.from({ length: 10 }, (_, index) => ({
  radius: 1.25 + (index % 4) * 0.42,
  duration: 0.62 + (index % 5) * 0.14,
  delay: index * 55,
}));

const STREAKS = Array.from({ length: 6 }, (_, index) => ({
  offset: 1.1 + index * 0.45,
  delay: index * 70,
}));

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function orbitStyle(radius: number, duration: number, delay: number): CSSProperties {
  return {
    ["--orbit-radius" as string]: `${radius}rem`,
    ["--orbit-duration" as string]: `${duration}s`,
    animationDelay: `${delay}ms`,
  };
}

export function MascotLightOrb({ animId, fromRef, toRef, onComplete }: MascotLightOrbProps) {
  const processedAnimIdRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const [flight, setFlight] = useState<OrbFlight | null>(null);
  const isClient = useIsClient();

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
    const startX = fromRect.left + fromRect.width / 2;
    const startY = fromRect.top + fromRect.height * 0.55;
    const toX = toRect.left + toRect.width / 2;
    const toY = toRect.top + toRect.height * 0.42;
    const flyDx = toX - startX;
    const flyDy = toY - startY;

    setFlight({
      startX,
      startY,
      flyDx,
      flyDy,
      flyAngle: (Math.atan2(flyDy, flyDx) * 180) / Math.PI,
    });

    const completeTimer = setTimeout(() => {
      setFlight(null);
      onCompleteRef.current();
    }, LIGHT_ORB_FLY_MS + 80);

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

  const layer = (
    <div
      className="mascot-light-orb-layer"
      style={{ ["--light-fly-duration" as string]: `${LIGHT_ORB_FLY_MS}ms` }}
      aria-hidden="true"
    >
      <div className="mascot-light-orb-wrap" style={wrapStyle}>
        <div className="mascot-light-orb-body">
          <span className="mascot-light-orb__halo" />
          <span className="mascot-light-orb__halo mascot-light-orb__halo--outer" />
          {STREAKS.map((streak, index) => (
            <span
              key={`streak-${index}`}
              className="mascot-light-orb__streak"
              style={{
                ["--streak-offset" as string]: `${streak.offset}rem`,
                animationDelay: `${streak.delay}ms`,
              }}
            />
          ))}
          {DOT_ORBITS.map((dot, index) => (
            <span
              key={`dot-${index}`}
              className="mascot-light-orb__orbit mascot-light-orb__orbit--reverse"
              style={orbitStyle(dot.radius, dot.duration, dot.delay)}
            >
              <span className="mascot-light-orb__dot" />
            </span>
          ))}
          {SPARKLE_ORBITS.map((sparkle, index) => (
            <span
              key={`sparkle-${index}`}
              className="mascot-light-orb__orbit"
              style={orbitStyle(sparkle.radius, sparkle.duration, sparkle.delay)}
            >
              <span className="mascot-light-orb__sparkle">{sparkle.symbol}</span>
            </span>
          ))}
          <span className="mascot-light-orb__trail" />
          <span className="mascot-light-orb" />
        </div>
      </div>
    </div>
  );

  return isClient ? createPortal(layer, document.body) : null;
}
