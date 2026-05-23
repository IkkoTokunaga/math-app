"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";

export const EVIL_ORB_CHARGE_MS = 300;
export const EVIL_ORB_FLY_MS = 720;

type OrbFlight = {
  startX: number;
  startY: number;
  flyDx: number;
  flyDy: number;
  flyAngle: number;
};

type OniEvilOrbProps = {
  animId: number;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  onHit: () => void;
  onComplete: () => void;
};

const POISON_ORBITS = Array.from({ length: 12 }, (_, index) => ({
  radius: 1.45 + (index % 5) * 0.36,
  duration: 0.58 + (index % 6) * 0.13,
  delay: index * 40,
  size: 0.34 + (index % 4) * 0.08,
}));

const DRIP_ORBITS = Array.from({ length: 8 }, (_, index) => ({
  radius: 1.2 + (index % 4) * 0.48,
  duration: 0.72 + (index % 5) * 0.16,
  delay: index * 65,
  tilt: -28 + (index % 6) * 12,
}));

const WISPS = Array.from({ length: 8 }, (_, index) => ({
  offset: 0.95 + index * 0.38,
  delay: index * 80,
  spread: -0.55 + (index % 5) * 0.28,
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
    const flyDx = toX - startX;
    const flyDy = toY - startY;

    setFlight({
      startX,
      startY,
      flyDx,
      flyDy,
      flyAngle: (Math.atan2(flyDy, flyDx) * 180) / Math.PI,
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

  const wrapStyle: CSSProperties = {
    left: flight.startX,
    top: flight.startY,
    ["--fly-dx" as string]: `${flight.flyDx}px`,
    ["--fly-dy" as string]: `${flight.flyDy}px`,
    ["--fly-angle" as string]: `${flight.flyAngle}deg`,
  };

  return (
    <div
      className="oni-evil-orb-layer"
      style={
        {
          ["--evil-charge-duration" as string]: `${EVIL_ORB_CHARGE_MS}ms`,
          ["--evil-fly-duration" as string]: `${EVIL_ORB_FLY_MS}ms`,
          ["--evil-fly-delay" as string]: `${EVIL_ORB_CHARGE_MS}ms`,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <div className="oni-evil-orb-wrap" style={wrapStyle}>
        <div className="oni-evil-orb-body">
          <span className="oni-evil-orb__mist" />
          <span className="oni-evil-orb__mist oni-evil-orb__mist--outer" />
          <span className="oni-evil-orb__fumes" />
          <span className="oni-evil-orb__fumes oni-evil-orb__fumes--inner" />
          {WISPS.map((wisp, index) => (
            <span
              key={`wisp-${index}`}
              className="oni-evil-orb__wisp"
              style={{
                ["--wisp-offset" as string]: `${wisp.offset}rem`,
                ["--wisp-spread" as string]: `${wisp.spread}rem`,
                animationDelay: `${wisp.delay}ms`,
              }}
            />
          ))}
          {POISON_ORBITS.map((poison, index) => (
            <span
              key={`poison-${index}`}
              className="oni-evil-orb__orbit"
              style={orbitStyle(poison.radius, poison.duration, poison.delay)}
            >
              <span
                className="oni-evil-orb__poison"
                style={{ width: `${poison.size}rem`, height: `${poison.size}rem` }}
              />
            </span>
          ))}
          {DRIP_ORBITS.map((drip, index) => (
            <span
              key={`drip-${index}`}
              className="oni-evil-orb__orbit oni-evil-orb__orbit--reverse"
              style={orbitStyle(drip.radius, drip.duration, drip.delay)}
            >
              <span
                className="oni-evil-orb__drip"
                style={{ ["--drip-tilt" as string]: `${drip.tilt}deg` }}
              />
            </span>
          ))}
          <span className="oni-evil-orb__trail" />
          <span className="oni-evil-orb" />
        </div>
      </div>
    </div>
  );
}
