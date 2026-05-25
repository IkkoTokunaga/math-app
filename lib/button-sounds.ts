"use client";

export const BUTTON_SOUND_SRC = "/sounds/button.mp3";

const audioPools = new Map<string, HTMLAudioElement[]>();

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

function playSound(src: string) {
  if (typeof window === "undefined") {
    return;
  }

  const audio = getAudio(src);
  void audio.play().catch(() => undefined);
}

export function playButtonSound() {
  playSound(BUTTON_SOUND_SRC);
}

export function primeButtonSounds() {
  if (typeof window === "undefined") {
    return;
  }

  getAudio(BUTTON_SOUND_SRC).load();
}

export function shouldPlayButtonSound(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  const interactive = target.closest("button, a[href]");
  if (!interactive) {
    return false;
  }

  if (interactive instanceof HTMLButtonElement && interactive.disabled) {
    return false;
  }

  if (
    interactive.classList.contains("keypad-btn") ||
    interactive.classList.contains("keypad-btn-submit")
  ) {
    return false;
  }

  return interactive.classList.contains("big-btn");
}
