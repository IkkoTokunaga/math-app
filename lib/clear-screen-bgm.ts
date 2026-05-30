"use client";

import { isPageHidden } from "@/lib/page-visibility";
import { waitForAudioReady } from "@/lib/audio-ready";
import { getBgmVolume } from "@/lib/bgm-volume";
import { stopHomeBgm } from "@/lib/home-bgm";
import { stopQuizBgm } from "@/lib/quiz-bgm";
import { isSoundEnabled } from "@/lib/sound-settings";
import { stopTimeAttackBgm } from "@/lib/time-attack-bgm";
import {
  updateMediaSessionMetadata,
  clearMediaSessionMetadata,
  pauseMediaSessionPlaybackState,
} from "@/lib/bgm-metadata";

export const CLEAR_SCREEN_BGM_SRC = "/sounds/bgm/bacteria.mp3";

let preloadAudio: HTMLAudioElement | null = null;
let bgmAudio: HTMLAudioElement | null = null;
let bgmPrimed = false;
let pendingPlay = false;
let pausedForBackground = false;

function getPreloadAudio(): HTMLAudioElement {
  if (preloadAudio == null) {
    preloadAudio = new Audio(CLEAR_SCREEN_BGM_SRC);
    preloadAudio.preload = "auto";
  }

  return preloadAudio;
}

export function primeClearScreenBgm(): void {
  if (typeof window === "undefined" || bgmPrimed) {
    return;
  }

  bgmPrimed = true;
  getPreloadAudio().load();
}

export function waitForClearScreenBgmReady(timeoutMs = 5000): Promise<void> {
  primeClearScreenBgm();
  return waitForAudioReady(getPreloadAudio(), timeoutMs);
}

export function isClearScreenBgmPlaying(): boolean {
  return bgmAudio != null && !bgmAudio.paused;
}

export function stopClearScreenBgm(): void {
  const audio = bgmAudio ?? preloadAudio;
  if (audio != null) {
    audio.pause();
    audio.currentTime = 0;
  }

  bgmAudio = null;
  pendingPlay = false;
  pausedForBackground = false;
  clearMediaSessionMetadata();
}

export function pauseClearScreenBgmForBackground(): void {
  const audio = bgmAudio;
  if (audio == null || audio.paused) {
    return;
  }

  audio.pause();
  pausedForBackground = true;
  pauseMediaSessionPlaybackState();
}

export function resumeClearScreenBgmFromBackground(): void {
  if (!pausedForBackground || bgmAudio == null || !isSoundEnabled()) {
    return;
  }

  pausedForBackground = false;
  void bgmAudio.play().then(() => {
    updateMediaSessionMetadata("クリア画面BGM");
  }).catch(() => {
    pausedForBackground = true;
    pauseMediaSessionPlaybackState();
  });
}

export function playClearScreenBgm(): void {
  if (typeof window === "undefined" || !isSoundEnabled()) {
    return;
  }

  primeClearScreenBgm();

  stopHomeBgm();
  stopQuizBgm();
  stopTimeAttackBgm();
  stopClearScreenBgm();

  const audio = getPreloadAudio();
  audio.loop = true;
  audio.volume = getBgmVolume();
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
      updateMediaSessionMetadata("クリア画面BGM");
      if (isPageHidden()) {
        pauseClearScreenBgmForBackground();
      }
    },
    () => {
      pendingPlay = true;
      bgmAudio = null;
    },
  );
}

export function resumePendingClearScreenBgm(): boolean {
  if (!pendingPlay) {
    return isClearScreenBgmPlaying();
  }

  if (isClearScreenBgmPlaying()) {
    return true;
  }

  playClearScreenBgm();
  return isClearScreenBgmPlaying();
}
