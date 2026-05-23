"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export const GATHER_MS = 1100;
export const CLUSTER_HOLD_MS = 160;
export const FLY_MS = 580;
const PARTICLE_COUNT = 18;
const WIDE_RADIUS_MIN = 95;
const WIDE_RADIUS_MAX = 200;

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

type GaugeLightChargeProps = {
  animId: number;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLDivElement | null>;
  fillRatio: number;
  onReachGauge: () => void;
  onComplete: () => void;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function GaugeLightCharge({
  animId,
  fromRef,
  toRef,
  fillRatio,
  onReachGauge,
  onComplete,
}: GaugeLightChargeProps) {
  const processedAnimIdRef = useRef(0);
  const onReachGaugeRef = useRef(onReachGauge);
  const onCompleteRef = useRef(onComplete);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [cluster, setCluster] = useState<Cluster | null>(null);

  useEffect(() => {
    onReachGaugeRef.current = onReachGauge;
    onCompleteRef.current = onComplete;
  }, [onReachGauge, onComplete]);

  useEffect(() => {
    if (animId === 0 || processedAnimIdRef.current === animId) {
      return;
    }

    processedAnimIdRef.current = animId;

    const fromEl = fromRef.current;
    const toEl = toRef.current;
    if (!fromEl || !toEl) {
      onReachGaugeRef.current();
      onCompleteRef.current();
      return;
    }

    if (prefersReducedMotion()) {
      onReachGaugeRef.current();
      onCompleteRef.current();
      return;
    }

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const centerX = fromRect.left + fromRect.width / 2;
    const centerY = fromRect.top + fromRect.height / 2;
    const clampedRatio = Math.max(0.04, Math.min(1, fillRatio));
    const toX = toRect.left + toRect.width * clampedRatio;
    const toY = toRect.top + toRect.height / 2;

    const nextParticles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
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

    setParticles(nextParticles);
    setCluster({
      centerX,
      centerY,
      flyDx: toX - centerX,
      flyDy: toY - centerY,
    });

    const impactMs = GATHER_MS + CLUSTER_HOLD_MS + FLY_MS;

    const reachTimer = setTimeout(() => {
      onReachGaugeRef.current();
    }, impactMs);

    const completeTimer = setTimeout(() => {
      setParticles([]);
      setCluster(null);
      onCompleteRef.current();
    }, impactMs + 140);

    return () => {
      clearTimeout(reachTimer);
      clearTimeout(completeTimer);
      setParticles([]);
      setCluster(null);
    };
  }, [animId, fillRatio, fromRef, toRef]);

  if (particles.length === 0 && !cluster) {
    return null;
  }

  const clusterDelay = GATHER_MS + CLUSTER_HOLD_MS;

  return (
    <div
      className="gauge-light-charge"
      style={
        {
          ["--gather-duration" as string]: `${GATHER_MS}ms`,
          ["--cluster-hold" as string]: `${CLUSTER_HOLD_MS}ms`,
          ["--fly-duration" as string]: `${FLY_MS}ms`,
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
}
