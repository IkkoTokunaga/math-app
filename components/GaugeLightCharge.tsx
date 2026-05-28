"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/use-is-client";

export const GATHER_MS = 1100;
export const CLUSTER_HOLD_MS = 160;
export const FLY_MS = 580;
export const ATTACK_GATHER_MS = 420;
export const ATTACK_CLUSTER_HOLD_MS = 100;
export const ATTACK_FLY_MS = 680;
export const GAUGE_LIGHT_COMPLETE_PAD_MS = 140;

const PARTICLE_COUNT = 18;
const WIDE_RADIUS_MIN = 95;
const WIDE_RADIUS_MAX = 200;
const GAUGE_ORBIT_MIN = 28;
const GAUGE_ORBIT_MAX = 88;

type Particle = {
  id: number;
  startX: number;
  startY: number;
  gatherDx: number;
  gatherDy: number;
  delayMs: number;
  size: number;
};

type Cluster = {
  centerX: number;
  centerY: number;
  flyDx: number;
  flyDy: number;
};

export type GaugeLightChargeMode = "feedbackToGauge" | "gaugeToMascot";

export function getGaugeLightChargeDuration(): number {
  return GATHER_MS + CLUSTER_HOLD_MS + FLY_MS + GAUGE_LIGHT_COMPLETE_PAD_MS;
}

type GaugeLightChargeProps = {
  animId: number;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  fillRatio?: number;
  mode?: GaugeLightChargeMode;
  /** 攻撃時はゲージ排出と同期した短いタイミングを使う */
  attackStream?: boolean;
  onReachTarget?: () => void;
  onComplete: () => void;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isLandscapeViewport(): boolean {
  return window.matchMedia("(min-aspect-ratio: 1/1)").matches;
}

/** Keep sparkle/glow inside the visible viewport (landscape HUD hugs the edges). */
function clampGlowPoint(x: number, y: number, margin = 32): { x: number; y: number } {
  const maxX = window.innerWidth - margin;
  const maxY = window.innerHeight - margin;
  return {
    x: Math.min(maxX, Math.max(margin, x)),
    y: Math.min(maxY, Math.max(margin, y)),
  };
}

function resolveMascotTarget(toRect: DOMRect): { x: number; y: number } {
  let toX = toRect.left + toRect.width / 2;
  let toY = toRect.top + toRect.height * 0.55;

  if (isLandscapeViewport()) {
    if (toRect.left < window.innerWidth * 0.42) {
      toX = toRect.left + toRect.width * 0.72;
    }
    if (toRect.top < window.innerHeight * 0.42) {
      toY = toRect.top + toRect.height * 0.68;
    }
  }

  return clampGlowPoint(toX, toY, isLandscapeViewport() ? 40 : 28);
}

function createFeedbackParticles(centerX: number, centerY: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const radius = WIDE_RADIUS_MIN + Math.random() * (WIDE_RADIUS_MAX - WIDE_RADIUS_MIN);
    const startX = centerX + Math.cos(angle) * radius;
    const startY = centerY + Math.sin(angle) * radius;
    return {
      id: i,
      startX,
      startY,
      gatherDx: centerX - startX,
      gatherDy: centerY - startY,
      delayMs: Math.floor(Math.random() * 220),
      size: 0.35 + Math.random() * 0.45,
    };
  });
}

function createGaugeDischargeParticles(fromRect: DOMRect, centerX: number, centerY: number): Particle[] {
  const glowMargin = isLandscapeViewport() ? 36 : 28;

  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const useOrbit = i % 3 === 0;
    let startX: number;
    let startY: number;

    if (useOrbit) {
      const angle = Math.random() * Math.PI * 2;
      const radius = GAUGE_ORBIT_MIN + Math.random() * (GAUGE_ORBIT_MAX - GAUGE_ORBIT_MIN);
      startX = centerX + Math.cos(angle) * radius;
      startY = centerY + Math.sin(angle) * radius;
    } else {
      startX = fromRect.left + fromRect.width * Math.random();
      startY = fromRect.top + fromRect.height / 2 + (Math.random() - 0.5) * 18;
    }

    const clamped = clampGlowPoint(startX, startY, glowMargin);
    startX = clamped.x;
    startY = clamped.y;

    return {
      id: i,
      startX,
      startY,
      gatherDx: centerX - startX,
      gatherDy: centerY - startY,
      delayMs: Math.floor(Math.random() * 180),
      size: 0.32 + Math.random() * 0.42,
    };
  });
}

export function GaugeLightCharge({
  animId,
  fromRef,
  toRef,
  fillRatio = 1,
  mode = "feedbackToGauge",
  attackStream = false,
  onReachTarget,
  onComplete,
}: GaugeLightChargeProps) {
  const processedAnimIdRef = useRef(0);
  const onReachTargetRef = useRef(onReachTarget);
  const onCompleteRef = useRef(onComplete);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const isClient = useIsClient();

  useEffect(() => {
    onReachTargetRef.current = onReachTarget;
    onCompleteRef.current = onComplete;
  }, [onReachTarget, onComplete]);

  useEffect(() => {
    if (animId === 0 || processedAnimIdRef.current === animId) {
      return;
    }

    processedAnimIdRef.current = animId;

    const fromEl = fromRef.current;
    const toEl = toRef.current;
    if (!fromEl || !toEl) {
      onReachTargetRef.current?.();
      onCompleteRef.current();
      return;
    }

    if (prefersReducedMotion()) {
      onReachTargetRef.current?.();
      onCompleteRef.current();
      return;
    }

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    let centerX = fromRect.left + fromRect.width / 2;
    let centerY = fromRect.top + fromRect.height / 2;

    let toX: number;
    let toY: number;
    if (mode === "gaugeToMascot") {
      ({ x: toX, y: toY } = resolveMascotTarget(toRect));
    } else {
      const clampedRatio = Math.max(0.04, Math.min(1, fillRatio));
      toX = toRect.left + toRect.width * clampedRatio;
      toY = toRect.top + toRect.height / 2;
      ({ x: toX, y: toY } = clampGlowPoint(toX, toY));
    }

    if (mode === "gaugeToMascot") {
      const clampedCenter = clampGlowPoint(centerX, centerY, isLandscapeViewport() ? 36 : 28);
      centerX = clampedCenter.x;
      centerY = clampedCenter.y;
    }

    const gatherMs = attackStream ? ATTACK_GATHER_MS : GATHER_MS;
    const clusterHoldMs = attackStream ? ATTACK_CLUSTER_HOLD_MS : CLUSTER_HOLD_MS;
    const flyMs = attackStream ? ATTACK_FLY_MS : FLY_MS;

    const nextParticles =
      mode === "gaugeToMascot"
        ? createGaugeDischargeParticles(fromRect, centerX, centerY)
        : createFeedbackParticles(centerX, centerY);

    setParticles(nextParticles);
    setCluster({
      centerX,
      centerY,
      flyDx: toX - centerX,
      flyDy: toY - centerY,
    });

    const impactMs = gatherMs + clusterHoldMs + flyMs;

    const reachTimer = setTimeout(() => {
      onReachTargetRef.current?.();
    }, impactMs);

    const completeTimer = setTimeout(() => {
      setParticles([]);
      setCluster(null);
      onCompleteRef.current();
    }, impactMs + GAUGE_LIGHT_COMPLETE_PAD_MS);

    return () => {
      clearTimeout(reachTimer);
      clearTimeout(completeTimer);
      setParticles([]);
      setCluster(null);
    };
  }, [animId, attackStream, fillRatio, fromRef, mode, toRef]);

  if (particles.length === 0 && !cluster) {
    return null;
  }

  const gatherMs = attackStream ? ATTACK_GATHER_MS : GATHER_MS;
  const clusterHoldMs = attackStream ? ATTACK_CLUSTER_HOLD_MS : CLUSTER_HOLD_MS;
  const flyMs = attackStream ? ATTACK_FLY_MS : FLY_MS;
  const clusterDelay = gatherMs + clusterHoldMs;

  const layer = (
    <div
      className={`gauge-light-charge ${mode === "gaugeToMascot" ? "gauge-light-charge--attack" : ""}`.trim()}
      style={
        {
          ["--gather-duration" as string]: `${gatherMs}ms`,
          ["--cluster-hold" as string]: `${clusterHoldMs}ms`,
          ["--fly-duration" as string]: `${flyMs}ms`,
          ["--cluster-delay" as string]: `${clusterDelay}ms`,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      {particles.map((particle) => (
        <span
          key={`${animId}-p-${particle.id}`}
          className="gauge-light-charge__particle"
          style={
            {
              left: particle.startX,
              top: particle.startY,
              width: `${particle.size}rem`,
              height: `${particle.size}rem`,
              ["--gather-dx" as string]: `${particle.gatherDx}px`,
              ["--gather-dy" as string]: `${particle.gatherDy}px`,
              ["--gather-delay" as string]: `${particle.delayMs}ms`,
              ["--sparkle-offset" as string]: `${particle.id * 47}ms`,
            } as React.CSSProperties
          }
        />
      ))}
      {cluster && (
        <span
          className="gauge-light-charge__cluster"
          style={
            {
              left: cluster.centerX,
              top: cluster.centerY,
              ["--fly-dx" as string]: `${cluster.flyDx}px`,
              ["--fly-dy" as string]: `${cluster.flyDy}px`,
            } as React.CSSProperties
          }
        />
      )}
    </div>
  );

  return isClient ? createPortal(layer, document.body) : null;
}
