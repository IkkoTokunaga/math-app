"use client";

import { primeButtonSounds } from "@/lib/button-sounds";
import { primeKeypadSounds, waitForKeypadSoundsReady } from "@/lib/keypad-sounds";
import { primeHomeBgm, waitForHomeBgmReady } from "@/lib/home-bgm";
import { primeQuizBgm, waitForQuizBgmReady } from "@/lib/quiz-bgm";
import { primeClearScreenBgm, waitForClearScreenBgmReady } from "@/lib/clear-screen-bgm";
import { primeQuizSounds } from "@/lib/quiz-sounds";
import { initSoundSettings } from "@/lib/sound-settings";

let ready = false;
let bootstrapping: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notifyReady(): void {
  listeners.forEach((listener) => listener());
}

export function isAppReady(): boolean {
  return ready;
}

export function subscribeAppReady(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function bootstrapApp(): Promise<void> {
  if (ready) {
    return Promise.resolve();
  }

  if (bootstrapping != null) {
    return bootstrapping;
  }

  bootstrapping = (async () => {
    if (typeof window === "undefined") {
      return;
    }

    initSoundSettings();
    primeButtonSounds();
    primeKeypadSounds();
    primeQuizSounds();
    primeHomeBgm();
    primeQuizBgm();
    primeClearScreenBgm();

    await Promise.all([
      waitForHomeBgmReady(),
      waitForQuizBgmReady(),
      waitForClearScreenBgmReady(),
      waitForKeypadSoundsReady(),
    ]);

    ready = true;
    notifyReady();
  })().catch(() => {
    ready = true;
    notifyReady();
  });

  return bootstrapping;
}

/** @internal test helper */
export function resetAppBootstrapForTests(): void {
  ready = false;
  bootstrapping = null;
  listeners.clear();
}
