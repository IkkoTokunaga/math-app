"use client";

import { isPageHidden } from "@/lib/page-visibility";
import { primeTimeAttackSounds } from "@/lib/time-attack-sounds";
import { BGM_VOLUME } from "@/lib/bgm-volume";
import { isSoundEnabled } from "@/lib/sound-settings";

export const TIME_ATTACK_BGM_TRACKS = [
  "/sounds/bgm/zangyousenshi.mp3",
  "/sounds/bgm/uzumaki.mp3",
  "/sounds/bgm/spadenoheitai.mp3",
  "/sounds/bgm/darkmatter.mp3",
  "/sounds/bgm/norainutonoranekonokousou.mp3",
  "/sounds/bgm/burikinosensou.mp3",
  "/sounds/bgm/kaisen.mp3",
  "/sounds/bgm/maounoshiro.mp3",
  "/sounds/bgm/shinkou.mp3",
  "/sounds/bgm/ryuukihei.mp3",
  "/sounds/bgm/kiheisen.mp3",
  "/sounds/bgm/noranekonoboudou.mp3",
  "/sounds/bgm/thanatos_kyouki.mp3",
] as const;

export const TIME_ATTACK_BGM_START_DELAY_MS = 1000;
const SESSION_STORAGE_PREFIX = "ta-bgm-state:";

export type TimeAttackBgmSessionState = {
  remaining: string[];
  currentTrack: string | null;
  bossKey: string | null;
};

export function getTimeAttackBossKey(state: {
  currentLevel: number;
  enmaNumber: number;
}): string {
  return `${state.currentLevel}-${state.enmaNumber}`;
}

export function shuffleTracks(tracks: readonly string[]): string[] {
  const next = [...tracks];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export class TimeAttackBgmQueue {
  private remaining: string[];

  constructor(
    private readonly tracks: readonly string[],
    initialRemaining: string[] | null = null,
  ) {
    this.remaining =
      initialRemaining != null && initialRemaining.length > 0
        ? [...initialRemaining]
        : shuffleTracks(tracks);
  }

  next(currentTrack?: string | null): string {
    if (this.remaining.length === 0) {
      this.remaining = shuffleTracks(this.tracks);
      if (
        currentTrack &&
        this.remaining[0] === currentTrack &&
        this.remaining.length > 1
      ) {
        const swapIndex =
          1 + Math.floor(Math.random() * (this.remaining.length - 1));
        [this.remaining[0], this.remaining[swapIndex]] = [
          this.remaining[swapIndex],
          this.remaining[0],
        ];
      }
    }

    return this.remaining.shift()!;
  }

  getRemaining(): string[] {
    return [...this.remaining];
  }
}

function sessionStorageKey(sessionId: string): string {
  return `${SESSION_STORAGE_PREFIX}${sessionId}`;
}

function isAllowedTrack(track: string): boolean {
  return TIME_ATTACK_BGM_TRACKS.includes(track as (typeof TIME_ATTACK_BGM_TRACKS)[number]);
}

export function loadTimeAttackBgmState(
  sessionId: string,
): TimeAttackBgmSessionState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(sessionStorageKey(sessionId));
    if (raw == null) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (parsed == null || typeof parsed !== "object") {
      return null;
    }

    const record = parsed as Partial<TimeAttackBgmSessionState>;
    const remaining = Array.isArray(record.remaining)
      ? record.remaining.filter(
          (track): track is string =>
            typeof track === "string" && isAllowedTrack(track),
        )
      : [];

    const currentTrack =
      typeof record.currentTrack === "string" && isAllowedTrack(record.currentTrack)
        ? record.currentTrack
        : null;

    const bossKey =
      typeof record.bossKey === "string" ? record.bossKey : null;

    if (remaining.length === 0 && currentTrack == null) {
      return null;
    }

    return {
      remaining,
      currentTrack,
      bossKey,
    };
  } catch {
    return null;
  }
}

export function saveTimeAttackBgmState(
  sessionId: string,
  state: TimeAttackBgmSessionState,
): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(sessionStorageKey(sessionId), JSON.stringify(state));
}

export function clearTimeAttackBgmState(sessionId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(sessionStorageKey(sessionId));
}

const preloadPool = new Map<string, HTMLAudioElement>();
let bgmPrimed = false;

let bgmAudio: HTMLAudioElement | null = null;
let currentTrack: string | null = null;
let pendingTrack: string | null = null;
let pausedForBackground = false;

function getPreloadAudio(src: string): HTMLAudioElement {
  const existing = preloadPool.get(src);
  if (existing) {
    return existing;
  }

  const audio = new Audio(src);
  audio.preload = "auto";
  preloadPool.set(src, audio);
  return audio;
}

export function primeTimeAttackBgm(): void {
  if (typeof window === "undefined" || bgmPrimed) {
    return;
  }

  bgmPrimed = true;

  for (const src of TIME_ATTACK_BGM_TRACKS) {
    getPreloadAudio(src).load();
  }
}

export function unlockTimeAttackBgm(): void {
  // Browser autoplay unlock is handled globally in audio-unlock.ts.
}

export function getCurrentTimeAttackBgmTrack(): string | null {
  return currentTrack;
}

export function isTimeAttackBgmPlaying(): boolean {
  return bgmAudio != null && !bgmAudio.paused;
}

export function stopTimeAttackBgm(): void {
  if (bgmAudio != null) {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    bgmAudio = null;
  }

  currentTrack = null;
  pendingTrack = null;
  pausedForBackground = false;
}

export function pauseTimeAttackBgmForBackground(): void {
  const audio = bgmAudio;
  if (audio == null || audio.paused) {
    return;
  }

  audio.pause();
  pausedForBackground = true;
}

export function resumeTimeAttackBgmFromBackground(): void {
  if (!pausedForBackground || bgmAudio == null || !isSoundEnabled()) {
    return;
  }

  pausedForBackground = false;
  void bgmAudio.play().catch(() => {
    pausedForBackground = true;
  });
}

export function playTimeAttackBgm(src: string): boolean {
  if (typeof window === "undefined" || !isSoundEnabled()) {
    return false;
  }

  primeTimeAttackBgm();

  if (currentTrack === src && bgmAudio != null && !bgmAudio.paused) {
    return true;
  }

  if (currentTrack === src && pausedForBackground) {
    return true;
  }

  stopTimeAttackBgm();

  const audio = getPreloadAudio(src);
  audio.loop = true;
  audio.volume = BGM_VOLUME;
  audio.currentTime = 0;
  bgmAudio = audio;
  currentTrack = src;
  pendingTrack = src;

  if (isPageHidden()) {
    pausedForBackground = true;
    pendingTrack = null;
    return true;
  }

  void audio.play().then(
    () => {
      if (pendingTrack === src) {
        pendingTrack = null;
      }
      if (isPageHidden()) {
        pauseTimeAttackBgmForBackground();
      }
    },
    () => {
      if (currentTrack === src) {
        currentTrack = null;
        bgmAudio = null;
      }
    },
  );

  return true;
}

export function resumePendingTimeAttackBgm(): boolean {
  if (pendingTrack == null) {
    return isTimeAttackBgmPlaying();
  }

  const track = pendingTrack;
  playTimeAttackBgm(track);
  return isTimeAttackBgmPlaying();
}

export function prepareTimeAttackBgmEntry(): void {
  primeTimeAttackSounds();
  primeTimeAttackBgm();
}
