"use client";

import { SFX_VOLUME } from "@/lib/bgm-volume";
import { isSoundEnabled } from "@/lib/sound-settings";

let audioContext: AudioContext | null = null;
let outputGain: GainNode | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (audioContext == null) {
    audioContext = new AudioContext({ latencyHint: "interactive" });
    outputGain = audioContext.createGain();
    outputGain.gain.value = SFX_VOLUME * 0.5;
    outputGain.connect(audioContext.destination);
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }

  return audioContext;
}

/** Short coin-like tick while the total score counts up. */
export function playScoreCountTick(): void {
  if (!isSoundEnabled()) {
    return;
  }

  const ctx = getContext();
  if (ctx == null || outputGain == null) {
    return;
  }

  const t = ctx.currentTime;
  const duration = 0.032;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(760 + Math.random() * 60, t);
  osc.frequency.exponentialRampToValueAtTime(1180, t + duration * 0.45);
  gain.gain.setValueAtTime(0.24, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain);
  gain.connect(outputGain);
  osc.start(t);
  osc.stop(t + duration + 0.01);
}

export function primeScoreSounds(): void {
  getContext();
}

/** @internal test helper */
export function resetScoreSoundsForTests(): void {
  void audioContext?.close();
  audioContext = null;
  outputGain = null;
}
