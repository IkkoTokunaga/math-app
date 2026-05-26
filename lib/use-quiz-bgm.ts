"use client";

import { useLayoutEffect } from "react";
import {
  isQuizBgmPlaying,
  playQuizBgm,
  primeQuizBgm,
  resumePendingQuizBgm,
  stopQuizBgm,
} from "@/lib/quiz-bgm";
import { useSoundEnabled } from "@/lib/use-sound-enabled";

export function useQuizBgm(active: boolean): void {
  const soundEnabled = useSoundEnabled();

  useLayoutEffect(() => {
    if (!active || !soundEnabled) {
      stopQuizBgm();
      return;
    }

    primeQuizBgm();
    playQuizBgm();
    resumePendingQuizBgm();

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
  }, [active, soundEnabled]);
}
