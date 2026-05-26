"use client";

import { isSoundEnabled } from "@/lib/sound-settings";

export const KEYPAD_DIGIT_SOUND_SRC = "/sounds/keypad-digit.mp3";

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
  pool.push(audio);
  audioPools.set(src, pool);
  return audio;
}

function playKeypadSound(src: string): void {
  if (typeof window === "undefined" || !isSoundEnabled()) {
    return;
  }

  primeKeypadSounds();

  const audio = getAudio(src);
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}

export function primeKeypadSounds(): void {
  if (typeof window === "undefined" || soundsPrimed) {
    return;
  }

  soundsPrimed = true;
  getAudio(KEYPAD_DIGIT_SOUND_SRC).load();
}

export function playKeypadDigitSound(): void {
  playKeypadSound(KEYPAD_DIGIT_SOUND_SRC);
}
