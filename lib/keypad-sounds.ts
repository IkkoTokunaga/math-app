"use client";

import { isSoundEnabled } from "@/lib/sound-settings";

let audioContext: AudioContext | null = null;
let outputGain: GainNode | null = null;
let soundsPrimed = false;
let pipelineWarmed = false;

function getOrCreateContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (audioContext == null) {
    audioContext = new AudioContext({ latencyHint: "interactive" });
    outputGain = audioContext.createGain();
    outputGain.gain.value = 1;
    outputGain.connect(audioContext.destination);
  }

  return audioContext;
}

function getOutputGain(ctx: AudioContext): GainNode {
  if (outputGain == null || outputGain.context !== ctx) {
    outputGain = ctx.createGain();
    outputGain.gain.value = 1;
    outputGain.connect(ctx.destination);
  }

  return outputGain;
}

function warmAudioPipeline(ctx: AudioContext): void {
  if (pipelineWarmed) {
    return;
  }

  pipelineWarmed = true;

  const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(getOutputGain(ctx));
  source.start(ctx.currentTime);
}

function ensureContextRunning(ctx: AudioContext): void {
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
}

/** ~18ms calculator-style click — no file fetch, instant attack. */
function playKeypadClick(ctx: AudioContext): void {
  const t = ctx.currentTime;
  const duration = 0.018;

  const osc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(1400, t);
  osc.frequency.exponentialRampToValueAtTime(700, t + duration);
  clickGain.gain.setValueAtTime(0.28, t);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(clickGain);
  clickGain.connect(getOutputGain(ctx));
  osc.start(t);
  osc.stop(t + duration + 0.002);

  const bufferSize = Math.max(1, Math.ceil(ctx.sampleRate * duration));
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const samples = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const decay = Math.exp(-i / (bufferSize * 0.2));
    samples[i] = (Math.random() * 2 - 1) * decay;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2500;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.14, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(getOutputGain(ctx));
  noise.start(t);
  noise.stop(t + duration + 0.002);
}

export function resumeKeypadAudioContext(): void {
  const ctx = getOrCreateContext();
  if (ctx == null) {
    return;
  }

  ensureContextRunning(ctx);
  warmAudioPipeline(ctx);
}

export function primeKeypadSounds(): void {
  if (typeof window === "undefined" || soundsPrimed) {
    return;
  }

  soundsPrimed = true;

  const ctx = getOrCreateContext();
  if (ctx != null) {
    warmAudioPipeline(ctx);
  }
}

export function waitForKeypadSoundsReady(): Promise<void> {
  primeKeypadSounds();
  return Promise.resolve();
}

export function playKeypadDigitSound(): void {
  if (typeof window === "undefined" || !isSoundEnabled()) {
    return;
  }

  primeKeypadSounds();

  const ctx = getOrCreateContext();
  if (ctx == null) {
    return;
  }

  ensureContextRunning(ctx);
  playKeypadClick(ctx);
}

/** @internal test helper */
export function resetKeypadSoundsForTests(): void {
  void audioContext?.close();
  audioContext = null;
  outputGain = null;
  soundsPrimed = false;
  pipelineWarmed = false;
}
