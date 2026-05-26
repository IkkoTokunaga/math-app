"use client";

import { isSoundEnabled } from "@/lib/sound-settings";
import { SFX_VOLUME } from "@/lib/bgm-volume";
import { unlockAudioPlayback } from "@/lib/audio-unlock";

export const BUTTON_SOUND_SRC = "/sounds/button.mp3";
export const TIME_ATTACK_START_SOUND_SRC = "/sounds/time-attack-start.mp3";
export const TIME_ATTACK_RESUME_SOUND_SRC = "/sounds/time-attack-resume.mp3";
export const LEVEL_START_SOUND_SRC = "/sounds/level-start.mp3";

const ALL_SOUND_SRCS = [
  BUTTON_SOUND_SRC,
  TIME_ATTACK_START_SOUND_SRC,
  TIME_ATTACK_RESUME_SOUND_SRC,
  LEVEL_START_SOUND_SRC,
] as const;

const TAP_MOVE_THRESHOLD_PX = 10;

const audioPools = new Map<string, HTMLAudioElement[]>();
let soundsPrimed = false;

function getAudio(src: string): HTMLAudioElement {
  const pool = audioPools.get(src) ?? [];
  const available = pool.find((audio) => audio.paused || audio.ended);
  if (available) {
    available.currentTime = 0;
    return available;
  }

  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = SFX_VOLUME;
  pool.push(audio);
  audioPools.set(src, pool);
  return audio;
}

function playSound(src: string) {
  if (typeof window === "undefined" || !isSoundEnabled()) {
    return;
  }

  primeButtonSounds();

  const audio = getAudio(src);
  audio.volume = SFX_VOLUME;
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}

export function playButtonSound() {
  playSound(BUTTON_SOUND_SRC);
}

export function playButtonSoundForTarget(target: EventTarget | null) {
  const src = resolveButtonSoundSrc(target);
  if (src == null) {
    return;
  }

  playSound(src);
}

export function primeButtonSounds() {
  if (typeof window === "undefined" || soundsPrimed) {
    return;
  }

  soundsPrimed = true;

  for (const src of ALL_SOUND_SRCS) {
    getAudio(src).load();
  }
}

export function unlockButtonSounds(): void {
  void unlockAudioPlayback();
}

export function resolveButtonSoundSrc(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const interactive = target.closest("button, a[href]");
  if (!(interactive instanceof HTMLElement)) {
    return null;
  }

  if (interactive instanceof HTMLButtonElement && interactive.disabled) {
    return null;
  }

  if (
    interactive.classList.contains("keypad-btn") ||
    interactive.classList.contains("keypad-btn-submit")
  ) {
    return null;
  }

  if (interactive.dataset.buttonSound === "time-attack-start") {
    return TIME_ATTACK_START_SOUND_SRC;
  }

  if (interactive.dataset.buttonSound === "time-attack-resume") {
    return TIME_ATTACK_RESUME_SOUND_SRC;
  }

  if (interactive.dataset.buttonSound === "level-start") {
    return LEVEL_START_SOUND_SRC;
  }

  if (interactive.classList.contains("big-btn")) {
    return BUTTON_SOUND_SRC;
  }

  if (interactive.classList.contains("operation-tabs__tab")) {
    return BUTTON_SOUND_SRC;
  }

  if (interactive.classList.contains("play-record-board__link")) {
    return BUTTON_SOUND_SRC;
  }

  return null;
}

export function shouldPlayButtonSound(target: EventTarget | null): boolean {
  return resolveButtonSoundSrc(target) != null;
}

export function didPointerTapMove(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): boolean {
  return (
    Math.hypot(endX - startX, endY - startY) > TAP_MOVE_THRESHOLD_PX
  );
}
