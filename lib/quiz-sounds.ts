"use client";

import type { Question } from "@/lib/db/schema";
import {
  getCorrectAnswerForOperation,
  type Operation,
} from "@/lib/operations";
import { isSoundEnabled } from "@/lib/sound-settings";
import { SFX_VOLUME } from "@/lib/bgm-volume";

export const QUIZ_CORRECT_SOUND_SRC = "/sounds/quiz-correct.mp3";
export const QUIZ_WRONG_SOUND_SRC = "/sounds/quiz-wrong.mp3";

const QUIZ_SOUND_SRCS = [QUIZ_CORRECT_SOUND_SRC, QUIZ_WRONG_SOUND_SRC] as const;

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

function playQuizSound(src: string): void {
  if (typeof window === "undefined" || !isSoundEnabled()) {
    return;
  }

  primeQuizSounds();

  const audio = getAudio(src);
  audio.volume = SFX_VOLUME;
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}

export function primeQuizSounds(): void {
  if (typeof window === "undefined" || soundsPrimed) {
    return;
  }

  soundsPrimed = true;

  for (const src of QUIZ_SOUND_SRCS) {
    getAudio(src).load();
  }
}

export function playQuizCorrectSound(): void {
  playQuizSound(QUIZ_CORRECT_SOUND_SRC);
}

export function playQuizWrongSound(): void {
  playQuizSound(QUIZ_WRONG_SOUND_SRC);
}

export function playQuizAnswerSound(
  operation: Operation,
  question: Question,
  answer: number,
): void {
  const isCorrect = answer === getCorrectAnswerForOperation(operation, question);
  if (isCorrect) {
    playQuizCorrectSound();
  } else {
    playQuizWrongSound();
  }
}
