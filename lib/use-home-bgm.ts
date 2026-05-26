"use client";

import { useLayoutEffect } from "react";
import {
  playHomeBgm,
  resumePendingHomeBgm,
  stopHomeBgm,
  unlockHomeBgm,
} from "@/lib/home-bgm";
import { useAppReady } from "@/lib/use-app-ready";
import { useSoundEnabled } from "@/lib/use-sound-enabled";

export function useHomeBgm(active: boolean): void {
  const soundEnabled = useSoundEnabled();
  const appReady = useAppReady();

  useLayoutEffect(() => {
    if (!active || !soundEnabled || !appReady) {
      stopHomeBgm();
      return;
    }

    playHomeBgm();

    const unlockUntilPlaying = () => {
      unlockHomeBgm();
      resumePendingHomeBgm();
    };

    document.addEventListener("pointerdown", unlockUntilPlaying, { capture: true });
    document.addEventListener("keydown", unlockUntilPlaying, { capture: true });

    return () => {
      document.removeEventListener("pointerdown", unlockUntilPlaying, { capture: true });
      document.removeEventListener("keydown", unlockUntilPlaying, { capture: true });
      stopHomeBgm();
    };
  }, [active, soundEnabled, appReady]);
}
