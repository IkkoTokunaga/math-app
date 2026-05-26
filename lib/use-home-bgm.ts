"use client";

import { useLayoutEffect } from "react";
import { unlockAudioPlayback } from "@/lib/audio-unlock";
import { stopClearScreenBgm } from "@/lib/clear-screen-bgm";
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

    stopClearScreenBgm();
    playHomeBgm();

    const unlockUntilPlaying = () => {
      void unlockAudioPlayback().then(() => {
        unlockHomeBgm();
        resumePendingHomeBgm();
      });
    };

    document.addEventListener("keydown", unlockUntilPlaying, { capture: true });

    return () => {
      document.removeEventListener("keydown", unlockUntilPlaying, { capture: true });
      stopHomeBgm();
    };
  }, [active, soundEnabled, appReady]);
}
