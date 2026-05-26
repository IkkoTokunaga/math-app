"use client";

import { BGM_VOLUME } from "@/lib/bgm-volume";
import { isSoundEnabled } from "@/lib/sound-settings";

export const HOME_BGM_SRC = "/sounds/bgm/uchuyuei.mp3";

let preloadAudio: HTMLAudioElement | null = null;
let bgmAudio: HTMLAudioElement | null = null;
let bgmPrimed = false;
let bgmUnlocked = false;
let pendingPlay = false;

function getPreloadAudio(): HTMLAudioElement {
  if (preloadAudio == null) {
    preloadAudio = new Audio(HOME_BGM_SRC);
    preloadAudio.preload = "auto";
  }

  return preloadAudio;
}

export function primeHomeBgm(): void {
  if (typeof window === "undefined" || bgmPrimed) {
    return;
  }

  bgmPrimed = true;
  getPreloadAudio().load();
}

export function unlockHomeBgm(): void {
  if (typeof window === "undefined" || bgmUnlocked) {
    return;
  }

  bgmUnlocked = true;
  primeHomeBgm();

  const audio = getPreloadAudio();
  const previousVolume = audio.volume;
  audio.volume = 0;
  void audio
    .play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
    })
    .catch(() => undefined)
    .finally(() => {
      audio.volume = previousVolume;
    });
}

export function isHomeBgmPlaying(): boolean {
  return bgmAudio != null && !bgmAudio.paused;
}

export function stopHomeBgm(): void {
  if (bgmAudio != null) {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    bgmAudio = null;
  }

  pendingPlay = false;
}

export function playHomeBgm(): void {
  if (typeof window === "undefined" || !isSoundEnabled()) {
    return;
  }

  primeHomeBgm();

  if (isHomeBgmPlaying()) {
    return;
  }

  stopHomeBgm();

  const audio = getPreloadAudio();
  audio.loop = true;
  audio.volume = BGM_VOLUME;
  audio.currentTime = 0;
  bgmAudio = audio;
  pendingPlay = true;

  void audio.play().then(
    () => {
      pendingPlay = false;
    },
    () => {
      pendingPlay = true;
      bgmAudio = null;
    },
  );
}

export function resumePendingHomeBgm(): boolean {
  if (!pendingPlay) {
    return isHomeBgmPlaying();
  }

  playHomeBgm();
  return isHomeBgmPlaying();
}
