"use client";

import { useSyncExternalStore } from "react";
import {
  initSoundSettings,
  isSoundEnabled,
  subscribeSoundSettings,
} from "@/lib/sound-settings";

function getServerSnapshot(): boolean {
  return true;
}

export function useSoundEnabled(): boolean {
  return useSyncExternalStore(
    subscribeSoundSettings,
    () => {
      initSoundSettings();
      return isSoundEnabled();
    },
    getServerSnapshot,
  );
}
