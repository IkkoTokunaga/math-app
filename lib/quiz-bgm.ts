"use client";

import { waitForAudioReady } from "@/lib/audio-ready";
import { BGM_VOLUME } from "@/lib/bgm-volume";
import { isSoundEnabled } from "@/lib/sound-settings";

export const QUIZ_BGM_SRC = "/sounds/bgm/quiz-bgm.mp3";

let preloadAudio: HTMLAudioElement | null = null;
let unlockAudio: HTMLAudioElement | null = null;
let bgmAudio: HTMLAudioElement | null = null;
let bgmPrimed = false;
let bgmUnlocked = false;
let pendingPlay = false;

function getPreloadAudio(): HTMLAudioElement {
  if (preloadAudio == null) {
    preloadAudio = new Audio(QUIZ_BGM_SRC);
    preloadAudio.preload = "auto";
  }

  return preloadAudio;
}

function getUnlockAudio(): HTMLAudioElement {
  if (unlockAudio == null) {
    unlockAudio = new Audio(QUIZ_BGM_SRC);
    unlockAudio.preload = "auto";
  }

  return unlockAudio;
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
  if (typeof window === "undefined" || bgmUnlocked) {
    return;
  }

  bgmUnlocked = true;
  primeQuizBgm();

  if (bgmAudio != null && !bgmAudio.paused) {
    return;
  }

  const audio = getUnlockAudio();
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
}

export function playQuizBgm(): void {
  if (typeof window === "undefined" || !isSoundEnabled()) {
    return;
  }

  primeQuizBgm();

  if (isQuizBgmPlaying()) {
    return;
  }

  stopQuizBgm();

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
