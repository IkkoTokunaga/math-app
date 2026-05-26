"use client";

import { isSoundEnabled } from "@/lib/sound-settings";
import { SFX_VOLUME } from "@/lib/bgm-volume";

export const TIME_ATTACK_BEAM_SOUND_SRC = "/sounds/time-attack-beam.mp3";
export const TIME_ATTACK_ONI_ATTACK_SOUND_SRC = "/sounds/time-attack-oni-attack.mp3";
export const ONI_ROAR_SOUND_SRCS = [
  "/sounds/oni-roar-1.mp3",
  "/sounds/oni-roar-2.mp3",
  "/sounds/oni-roar-3.mp3",
] as const;

const TIME_ATTACK_SOUND_SRCS = [
  TIME_ATTACK_BEAM_SOUND_SRC,
  TIME_ATTACK_ONI_ATTACK_SOUND_SRC,
  ...ONI_ROAR_SOUND_SRCS,
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
  audio.volume = SFX_VOLUME;
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
  audio.volume = SFX_VOLUME;
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

export function playTimeAttackOniRoarSound(): void {
  const index = Math.floor(Math.random() * ONI_ROAR_SOUND_SRCS.length);
  playTimeAttackSound(ONI_ROAR_SOUND_SRCS[index]!);
}
