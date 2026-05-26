"use client";

import { isPageHidden } from "@/lib/page-visibility";
import { waitForAudioReady } from "@/lib/audio-ready";
import { BGM_VOLUME } from "@/lib/bgm-volume";
import { isSoundEnabled } from "@/lib/sound-settings";

export const QUIZ_BGM_SRC = "/sounds/bgm/quiz-bgm.mp3";

let preloadAudio: HTMLAudioElement | null = null;
let bgmAudio: HTMLAudioElement | null = null;
let bgmPrimed = false;
let pendingPlay = false;
let pausedForBackground = false;

function getPreloadAudio(): HTMLAudioElement {
  if (preloadAudio == null) {
    preloadAudio = new Audio(QUIZ_BGM_SRC);
    preloadAudio.preload = "auto";
  }

  return preloadAudio;
}

export function primeQuizBgm(): void {
  if (typeof window === "undefined" || bgmPrimed) {
    return;
  }

  bgmPrimed = true;
  getPreloadAudio().load();
}

export function waitForQuizBgmReady(timeoutMs = 5000): Promise<void> {
  primeQuizBgm();
  return waitForAudioReady(getPreloadAudio(), timeoutMs);
}

export function unlockQuizBgm(): void {
  // Browser autoplay unlock is handled globally in audio-unlock.ts.
}

export function isQuizBgmPlaying(): boolean {
  return bgmAudio != null && !bgmAudio.paused;
}

export function stopQuizBgm(): void {
  if (bgmAudio != null) {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    bgmAudio = null;
  }

  pendingPlay = false;
  pausedForBackground = false;
}

export function pauseQuizBgmForBackground(): void {
  const audio = bgmAudio;
  if (audio == null || audio.paused) {
    return;
  }

  audio.pause();
  pausedForBackground = true;
}

export function resumeQuizBgmFromBackground(): void {
  if (!pausedForBackground || bgmAudio == null || !isSoundEnabled()) {
    return;
  }

  pausedForBackground = false;
  void bgmAudio.play().catch(() => {
    pausedForBackground = true;
  });
}

export function playQuizBgm(): void {
  if (typeof window === "undefined" || !isSoundEnabled()) {
    return;
  }

  primeQuizBgm();

  if (isQuizBgmPlaying() || pausedForBackground) {
    return;
  }

  stopQuizBgm();

  const audio = getPreloadAudio();
  audio.loop = true;
  audio.volume = BGM_VOLUME;
  audio.currentTime = 0;
  bgmAudio = audio;
  pendingPlay = true;

  if (isPageHidden()) {
    pausedForBackground = true;
    pendingPlay = false;
    return;
  }

  void audio.play().then(
    () => {
      pendingPlay = false;
      if (isPageHidden()) {
        pauseQuizBgmForBackground();
      }
    },
    () => {
      pendingPlay = true;
      bgmAudio = null;
    },
  );
}

export function resumePendingQuizBgm(): boolean {
  if (!pendingPlay) {
    return isQuizBgmPlaying();
  }

  if (isQuizBgmPlaying()) {
    return true;
  }

  playQuizBgm();
  return isQuizBgmPlaying();
}
