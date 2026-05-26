"use client";

import { useLayoutEffect } from "react";
import { unlockAudioPlayback } from "@/lib/audio-unlock";
import {
  isClearScreenBgmPlaying,
  playClearScreenBgm,
  resumePendingClearScreenBgm,
  stopClearScreenBgm,
} from "@/lib/clear-screen-bgm";
import { useAppReady } from "@/lib/use-app-ready";
import { useSoundEnabled } from "@/lib/use-sound-enabled";

export function useClearScreenBgm(active: boolean): void {
  const soundEnabled = useSoundEnabled();
  const appReady = useAppReady();

  useLayoutEffect(() => {
    if (!active || !soundEnabled || !appReady) {
      stopClearScreenBgm();
      return;
    }

    playClearScreenBgm();

    const unlockUntilPlaying = () => {
      void unlockAudioPlayback().then(() => {
        if (isClearScreenBgmPlaying()) {
          return;
        }

        resumePendingClearScreenBgm();
      });
    };

    document.addEventListener("keydown", unlockUntilPlaying, { capture: true });

    return () => {
      document.removeEventListener("keydown", unlockUntilPlaying, { capture: true });
      stopClearScreenBgm();
    };
  }, [active, soundEnabled, appReady]);
}
