"use client";

import { useLayoutEffect } from "react";
import {
  isQuizBgmPlaying,
  playQuizBgm,
  resumePendingQuizBgm,
  stopQuizBgm,
} from "@/lib/quiz-bgm";
import { useAppReady } from "@/lib/use-app-ready";
import { useSoundEnabled } from "@/lib/use-sound-enabled";

export function useQuizBgm(active: boolean): void {
  const soundEnabled = useSoundEnabled();
  const appReady = useAppReady();

  useLayoutEffect(() => {
    if (!active || !soundEnabled || !appReady) {
      stopQuizBgm();
      return;
    }

    playQuizBgm();

    const unlockUntilPlaying = () => {
      if (isQuizBgmPlaying()) {
        return;
      }

      resumePendingQuizBgm();
    };

    document.addEventListener("pointerdown", unlockUntilPlaying, { capture: true });
    document.addEventListener("keydown", unlockUntilPlaying, { capture: true });

    return () => {
      document.removeEventListener("pointerdown", unlockUntilPlaying, { capture: true });
      document.removeEventListener("keydown", unlockUntilPlaying, { capture: true });
      stopQuizBgm();
    };
  }, [active, soundEnabled, appReady]);
}
