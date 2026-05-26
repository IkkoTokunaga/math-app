"use client";

const UNLOCK_SOUND_SRC = "/sounds/button.mp3";

let unlocked = false;
let unlocking: Promise<void> | null = null;
let unlockAudio: HTMLAudioElement | null = null;

function getUnlockAudio(): HTMLAudioElement {
  if (unlockAudio == null) {
    unlockAudio = new Audio(UNLOCK_SOUND_SRC);
    unlockAudio.preload = "auto";
  }

  return unlockAudio;
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

export function unlockAudioPlayback(): Promise<void> {
  if (typeof window === "undefined" || unlocked) {
    return Promise.resolve();
  }

  if (unlocking != null) {
    return unlocking;
  }

  unlocking = new Promise((resolve) => {
    const audio = getUnlockAudio();
    audio.volume = 0;
    void audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 1;
        unlocked = true;
        resolve();
      })
      .catch(() => {
        unlocked = true;
        resolve();
      })
      .finally(() => {
        unlocking = null;
      });
  });

  return unlocking;
}

/** @internal test helper */
export function resetAudioUnlockForTests(): void {
  unlocked = false;
  unlocking = null;
  unlockAudio = null;
}
