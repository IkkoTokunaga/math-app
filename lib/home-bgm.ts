"use client";

import { isPageHidden } from "@/lib/page-visibility";
import { waitForAudioReady } from "@/lib/audio-ready";
import { getBgmVolume } from "@/lib/bgm-volume";
import { isSoundEnabled } from "@/lib/sound-settings";
import {
  updateMediaSessionMetadata,
  clearMediaSessionMetadata,
  pauseMediaSessionPlaybackState,
} from "@/lib/bgm-metadata";

export const HOME_BGM_SRC = "/sounds/bgm/uchuyuei.mp3";

let preloadAudio: HTMLAudioElement | null = null;
let bgmAudio: HTMLAudioElement | null = null;
let bgmPrimed = false;
let pendingPlay = false;
let awaitingUnmute = false;
let pausedForBackground = false;

function getPreloadAudio(): HTMLAudioElement {
  if (preloadAudio == null) {
    preloadAudio = new Audio(HOME_BGM_SRC);
    preloadAudio.preload = "auto";
  }

  return preloadAudio;
}

function finishHomeBgmUnlock(): void {
  if (tryUnmuteHomeBgm()) {
    return;
  }

  if (pendingPlay || awaitingUnmute) {
    resumePendingHomeBgm();
  }
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

  finishHomeBgmUnlock();
}

export function tryUnmuteHomeBgm(): boolean {
  const audio = bgmAudio;
  if (audio == null || !audio.muted || audio.paused) {
    return false;
  }

  audio.muted = false;
  audio.volume = getBgmVolume();
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
  pausedForBackground = false;
  clearMediaSessionMetadata();
}

export function pauseHomeBgmForBackground(): void {
  const audio = bgmAudio;
  if (audio == null || audio.paused) {
    return;
  }

  audio.pause();
  pausedForBackground = true;
  pauseMediaSessionPlaybackState();
}

export function resumeHomeBgmFromBackground(): void {
  if (!pausedForBackground || bgmAudio == null || !isSoundEnabled()) {
    return;
  }

  pausedForBackground = false;

  if (bgmAudio.paused) {
    void bgmAudio.play().then(() => {
      updateMediaSessionMetadata("ホームBGM");
    }).catch(() => {
      pausedForBackground = true;
      pauseMediaSessionPlaybackState();
    });
  }
}

function startMutedHomeBgm(audio: HTMLAudioElement): void {
  audio.muted = true;

  if (isPageHidden()) {
    pausedForBackground = true;
    awaitingUnmute = true;
    pendingPlay = true;
    return;
  }

  void audio.play().then(
    () => {
      awaitingUnmute = true;
      pendingPlay = true;

      if (isPageHidden()) {
        pauseHomeBgmForBackground();
        return;
      }

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

  if (isHomeBgmPlaying()) {
    return;
  }

  stopHomeBgm();

  const audio = getPreloadAudio();
  audio.loop = true;
  audio.muted = false;
  audio.volume = getBgmVolume();
  audio.currentTime = 0;
  bgmAudio = audio;
  pendingPlay = true;
  awaitingUnmute = false;

  if (isPageHidden()) {
    pausedForBackground = true;
    pendingPlay = false;
    return;
  }

  void audio.play().then(
    () => {
      pendingPlay = false;
      updateMediaSessionMetadata("ホームBGM");
      if (isPageHidden()) {
        pauseHomeBgmForBackground();
      }
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
