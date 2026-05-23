"use client";

type MascotBeamProps = {
  active: boolean;
  intensity?: number;
};

export function MascotBeam({ active, intensity = 1 }: MascotBeamProps) {
  if (!active) {
    return null;
  }

  const power = Math.min(1.4, 0.65 + intensity / 1200);

  return (
    <div className="mascot-beam-layer" aria-hidden="true">
      <div
        className="mascot-beam"
        style={{
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
  );
}
