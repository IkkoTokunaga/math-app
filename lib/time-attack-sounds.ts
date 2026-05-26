"use client";

import { isSoundEnabled } from "@/lib/sound-settings";

export const TIME_ATTACK_BEAM_SOUND_SRC = "/sounds/time-attack-beam.mp3";
export const TIME_ATTACK_ONI_ATTACK_SOUND_SRC = "/sounds/time-attack-oni-attack.mp3";

const TIME_ATTACK_SOUND_SRCS = [
  TIME_ATTACK_BEAM_SOUND_SRC,
  TIME_ATTACK_ONI_ATTACK_SOUND_SRC,
] as const;

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

function playTimeAttackSound(src: string): void {
  if (typeof window === "undefined" || !isSoundEnabled()) {
    return;
  }

  primeTimeAttackSounds();

  const audio = getAudio(src);
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}

export function primeTimeAttackSounds(): void {
  if (typeof window === "undefined" || soundsPrimed) {
    return;
  }

  soundsPrimed = true;

  for (const src of TIME_ATTACK_SOUND_SRCS) {
    getAudio(src).load();
  }
}

export function playTimeAttackBeamSound(): void {
  playTimeAttackSound(TIME_ATTACK_BEAM_SOUND_SRC);
}

export function playTimeAttackOniAttackSound(): void {
  playTimeAttackSound(TIME_ATTACK_ONI_ATTACK_SOUND_SRC);
}
