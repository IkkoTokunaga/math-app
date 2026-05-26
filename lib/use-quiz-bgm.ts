"use client";

import { useLayoutEffect } from "react";
import { unlockAudioPlayback } from "@/lib/audio-unlock";
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
      void unlockAudioPlayback().then(() => {
        if (isQuizBgmPlaying()) {
          return;
        }

        resumePendingQuizBgm();
      });
    };

    document.addEventListener("keydown", unlockUntilPlaying, { capture: true });

    return () => {
      document.removeEventListener("keydown", unlockUntilPlaying, { capture: true });
      stopQuizBgm();
    };
  }, [active, soundEnabled, appReady]);
}
