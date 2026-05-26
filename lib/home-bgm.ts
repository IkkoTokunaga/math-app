"use client";

import { waitForAudioReady } from "@/lib/audio-ready";
import { BGM_VOLUME } from "@/lib/bgm-volume";
import { isSoundEnabled } from "@/lib/sound-settings";

export const HOME_BGM_SRC = "/sounds/bgm/uchuyuei.mp3";

let preloadAudio: HTMLAudioElement | null = null;
let unlockAudio: HTMLAudioElement | null = null;
let bgmAudio: HTMLAudioElement | null = null;
let bgmPrimed = false;
let bgmUnlocked = false;
let pendingPlay = false;
let awaitingUnmute = false;

function getPreloadAudio(): HTMLAudioElement {
  if (preloadAudio == null) {
    preloadAudio = new Audio(HOME_BGM_SRC);
    preloadAudio.preload = "auto";
  }

  return preloadAudio;
}

function getUnlockAudio(): HTMLAudioElement {
  if (unlockAudio == null) {
    unlockAudio = new Audio(HOME_BGM_SRC);
    unlockAudio.preload = "auto";
  }

  return unlockAudio;
}

function finishHomeBgmUnlock(): void {
  if (tryUnmuteHomeBgm()) {
    return;
  }

  resumePendingHomeBgm();
}

export function primeHomeBgm(): void {
  if (typeof window === "undefined" || bgmPrimed) {
    return;
  }

  bgmPrimed = true;
  getPreloadAudio().load();
}

export function waitForHomeBgmReady(timeoutMs = 5000): Promise<void> {
  primeHomeBgm();
  return waitForAudioReady(getPreloadAudio(), timeoutMs);
}

export function unlockHomeBgm(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (bgmUnlocked) {
    finishHomeBgmUnlock();
    return;
  }

  bgmUnlocked = true;
  primeHomeBgm();

  if (bgmAudio != null && !bgmAudio.paused) {
    finishHomeBgmUnlock();
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
      finishHomeBgmUnlock();
    });
}

export function tryUnmuteHomeBgm(): boolean {
  const audio = bgmAudio;
  if (audio == null || !audio.muted || audio.paused) {
    return false;
  }

  audio.muted = false;
  audio.volume = BGM_VOLUME;
  awaitingUnmute = false;
  pendingPlay = false;
  return true;
}

export function isHomeBgmPlaying(): boolean {
  return bgmAudio != null && !bgmAudio.paused;
}

export function stopHomeBgm(): void {
  if (bgmAudio != null) {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    bgmAudio.muted = false;
    bgmAudio = null;
  }

  pendingPlay = false;
  awaitingUnmute = false;
}

function startMutedHomeBgm(audio: HTMLAudioElement): void {
  audio.muted = true;
  void audio.play().then(
    () => {
      awaitingUnmute = true;
      pendingPlay = true;

      if (tryUnmuteHomeBgm()) {
        return;
      }
    },
    () => {
      pendingPlay = true;
      bgmAudio = null;
      awaitingUnmute = false;
    },
  );
}

export function playHomeBgm(): void {
  if (typeof window === "undefined" || !isSoundEnabled()) {
    return;
  }

  primeHomeBgm();

  if (isHomeBgmPlaying() || awaitingUnmute) {
    return;
  }

  stopHomeBgm();

  const audio = getPreloadAudio();
  audio.loop = true;
  audio.muted = false;
  audio.volume = BGM_VOLUME;
  audio.currentTime = 0;
  bgmAudio = audio;
  pendingPlay = true;
  awaitingUnmute = false;

  void audio.play().then(
    () => {
      pendingPlay = false;
    },
    () => {
      startMutedHomeBgm(audio);
    },
  );
}

export function resumePendingHomeBgm(): boolean {
  if (awaitingUnmute) {
    return tryUnmuteHomeBgm();
  }

  if (!pendingPlay) {
    return isHomeBgmPlaying();
  }

  if (tryUnmuteHomeBgm()) {
    return true;
  }

  if (isHomeBgmPlaying()) {
    return true;
  }

  playHomeBgm();
  return isHomeBgmPlaying();
}
