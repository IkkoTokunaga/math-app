"use client";

import { useEffect } from "react";
import {
  playButtonSound,
  primeButtonSounds,
  shouldPlayButtonSound,
} from "@/lib/button-sounds";

export function ButtonSoundLayer() {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      if (!shouldPlayButtonSound(event.target)) {
        return;
      }

      playButtonSound();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerdown", primeButtonSounds, { once: true });

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return null;
}
