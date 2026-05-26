"use client";

type MascotPoisonSkullProps = {
  active: boolean;
};

const SKULLS = [
  { className: "mascot-poison-skull mascot-poison-skull--1", label: "☠" },
  { className: "mascot-poison-skull mascot-poison-skull--2", label: "☠" },
  { className: "mascot-poison-skull mascot-poison-skull--3", label: "☠" },
  { className: "mascot-poison-skull mascot-poison-skull--4", label: "☠" },
];

export function MascotPoisonSkull({ active }: MascotPoisonSkullProps) {
  if (!active) {
    return null;
  }

  return (
    <div className="mascot-poison-layer" aria-hidden="true">
      <span className="mascot-poison-mist mascot-poison-mist--a" />
      <span className="mascot-poison-mist mascot-poison-mist--b" />
      {SKULLS.map((skull) => (
        <span key={skull.className} className={skull.className}>
          {skull.label}
        </span>
      ))}
      <span className="mascot-poison-bubble mascot-poison-bubble--1" />
      <span className="mascot-poison-bubble mascot-poison-bubble--2" />
      <span className="mascot-poison-bubble mascot-poison-bubble--3" />
    </div>
  );
}
