"use client";

import { isSoundEnabled } from "@/lib/sound-settings";

export const KEYPAD_BACKSPACE_SOUND_SRC = "/sounds/keypad-backspace.wav";

let audioContext: AudioContext | null = null;
let outputGain: GainNode | null = null;
let backspaceBuffer: AudioBuffer | null = null;
let backspaceOffset = 0;
let decodePromise: Promise<void> | null = null;
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

function findPlaybackOffset(buffer: AudioBuffer): number {
  const channel = buffer.getChannelData(0);
  let peak = 0;

  for (let i = 0; i < channel.length; i++) {
    peak = Math.max(peak, Math.abs(channel[i]));
  }

  if (peak === 0) {
    return 0;
  }

  const threshold = peak * 0.12;
  for (let i = 0; i < channel.length; i++) {
    if (Math.abs(channel[i]) >= threshold) {
      return i / buffer.sampleRate;
    }
  }

  return 0;
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

function playBuffer(ctx: AudioContext, buffer: AudioBuffer, offset: number): void {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(getOutputGain(ctx));
  source.start(ctx.currentTime, offset);
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

async function decodeBackspaceBuffer(): Promise<void> {
  if (backspaceBuffer != null) {
    return;
  }

  const ctx = getOrCreateContext();
  if (ctx == null) {
    return;
  }

  const response = await fetch(KEYPAD_BACKSPACE_SOUND_SRC);
  const arrayBuffer = await response.arrayBuffer();
  backspaceBuffer = await ctx.decodeAudioData(arrayBuffer);
  backspaceOffset = findPlaybackOffset(backspaceBuffer);
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

  decodePromise = decodeBackspaceBuffer()
    .then(() => {
      const context = getOrCreateContext();
      if (context != null) {
        warmAudioPipeline(context);
      }
    })
    .catch(() => undefined);
}

export function waitForKeypadSoundsReady(timeoutMs = 3000): Promise<void> {
  primeKeypadSounds();

  if (backspaceBuffer != null) {
    return Promise.resolve();
  }

  if (decodePromise == null) {
    return Promise.resolve();
  }

  return Promise.race([
    decodePromise,
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
}

function playPreparedSound(play: (ctx: AudioContext) => void): void {
  if (typeof window === "undefined" || !isSoundEnabled()) {
    return;
  }

  primeKeypadSounds();

  const ctx = getOrCreateContext();
  if (ctx == null) {
    return;
  }

  ensureContextRunning(ctx);
  play(ctx);
}

export function playKeypadDigitSound(): void {
  playPreparedSound(playKeypadClick);
}

export function playKeypadBackspaceSound(): void {
  playPreparedSound((ctx) => {
    if (backspaceBuffer != null) {
      playBuffer(ctx, backspaceBuffer, backspaceOffset);
      return;
    }

    void decodePromise?.then(() => {
      if (backspaceBuffer != null && isSoundEnabled()) {
        const context = getOrCreateContext();
        if (context != null) {
          playBuffer(context, backspaceBuffer, backspaceOffset);
        }
      }
    });
  });
}

/** @internal test helper */
export function resetKeypadSoundsForTests(): void {
  void audioContext?.close();
  audioContext = null;
  outputGain = null;
  backspaceBuffer = null;
  backspaceOffset = 0;
  decodePromise = null;
  soundsPrimed = false;
  pipelineWarmed = false;
}
