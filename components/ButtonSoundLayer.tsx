"use client";

import { useEffect } from "react";
import {
  playButtonSound,
  primeButtonSounds,
  shouldPlayButtonSound,
} from "@/lib/button-sounds";

export function ButtonSoundLayer() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!event.isTrusted) {
        return;
      }

      if (event.button !== 0) {
        return;
      }

      if (!shouldPlayButtonSound(event.target)) {
        return;
      }

      playButtonSound();
    };

    document.addEventListener("click", onClick);
    document.addEventListener("pointerdown", primeButtonSounds, { once: true });

    return () => {
      document.removeEventListener("click", onClick);
    };
  }, []);

  return null;
}
