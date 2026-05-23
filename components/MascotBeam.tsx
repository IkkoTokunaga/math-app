"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

type MascotBeamProps = {
  active: boolean;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  intensity?: number;
};

type BeamAim = {
  left: number;
  top: number;
  length: number;
  angle: number;
};

function measureBeam(fromEl: HTMLElement, toEl: HTMLElement): BeamAim {
  const from = fromEl.getBoundingClientRect();
  const to = toEl.getBoundingClientRect();
  const fromX = from.left + from.width / 2;
  const fromY = from.top + from.height * 0.55;
  const toX = to.left + to.width / 2;
  const toY = to.top + to.height * 0.42;
  const dx = toX - fromX;
  const dy = toY - fromY;

  return {
    left: fromX,
    top: fromY,
    length: Math.max(24, Math.hypot(dx, dy)),
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

export function MascotBeam({ active, fromRef, toRef, intensity = 1 }: MascotBeamProps) {
  const [aim, setAim] = useState<BeamAim | null>(null);

  useLayoutEffect(() => {
    if (!active) {
      setAim(null);
      return;
    }

    const fromEl = fromRef.current;
    const toEl = toRef.current;
    if (!fromEl || !toEl) {
      return;
    }

    setAim(measureBeam(fromEl, toEl));
  }, [active, fromRef, toRef]);

  if (!active || !aim) {
    return null;
  }

  const power = Math.min(1.4, 0.65 + intensity / 1200);

  return (
    <div className="mascot-beam-layer" aria-hidden="true">
      <div
        className="mascot-beam-aim"
        style={{
          left: aim.left,
          top: aim.top,
          transform: `rotate(${aim.angle}deg)`,
        }}
      >
        <div
          className="mascot-beam mascot-beam--aimed"
          style={{
            width: aim.length,
            ["--beam-power" as string]: String(power),
          }}
        >
          <span className="mascot-beam__core" />
          <span className="mascot-beam__glow" />
          <span className="mascot-beam__spark mascot-beam__spark--1">✦</span>
          <span className="mascot-beam__spark mascot-beam__spark--2">✦</span>
          <span className="mascot-beam__spark mascot-beam__spark--3">✦</span>
        </div>
      </div>
    </div>
  );
}

export type OniPhase = "idle" | "shaking" | "exploding" | "hidden" | "entering";
