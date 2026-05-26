"use client";

import { useLayoutEffect } from "react";
import {
  isHomeBgmPlaying,
  playHomeBgm,
  primeHomeBgm,
  resumePendingHomeBgm,
  stopHomeBgm,
} from "@/lib/home-bgm";
import { useSoundEnabled } from "@/lib/use-sound-enabled";

export function useHomeBgm(active: boolean): void {
  const soundEnabled = useSoundEnabled();

  useLayoutEffect(() => {
    if (!active || !soundEnabled) {
      stopHomeBgm();
      return;
    }

    primeHomeBgm();
    playHomeBgm();
    resumePendingHomeBgm();

    const unlockUntilPlaying = () => {
      if (isHomeBgmPlaying()) {
        return;
      }

      resumePendingHomeBgm();
    };

    document.addEventListener("pointerdown", unlockUntilPlaying, { capture: true });
    document.addEventListener("keydown", unlockUntilPlaying, { capture: true });

    return () => {
      document.removeEventListener("pointerdown", unlockUntilPlaying, { capture: true });
      document.removeEventListener("keydown", unlockUntilPlaying, { capture: true });
      stopHomeBgm();
    };
  }, [active, soundEnabled]);
}
