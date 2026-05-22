"use client";

import type { Level } from "@/lib/questions";

const STORAGE_KEY = "math-app-unlock-celebrations";

type CelebrationStore = Record<string, number[]>;

function readStore(): CelebrationStore {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as CelebrationStore;
  } catch {
    return {};
  }
}

function writeStore(store: CelebrationStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getUnlockCelebrationPlayerKey(loggedIn: boolean, playerId?: string): string {
  return loggedIn && playerId ? `member:${playerId}` : "guest";
}

function getCelebratedLevels(playerKey: string): Set<Level> {
  const celebrated = readStore()[playerKey] ?? [];
  return new Set([1 as Level, ...(celebrated as Level[])]);
}

/** 初回解放演出が未表示のレベル（2以上）を返す。複数あれば小さい方から。 */
export function getPendingUnlockCelebration(
  playerKey: string,
  unlockedLevel: Level,
): Level | null {
  if (unlockedLevel <= 1) {
    return null;
  }

  const celebrated = getCelebratedLevels(playerKey);
  for (let level = 2; level <= unlockedLevel; level += 1) {
    if (!celebrated.has(level as Level)) {
      return level as Level;
    }
  }

  return null;
}

export function markUnlockCelebrated(playerKey: string, level: Level): void {
  if (level <= 1) {
    return;
  }

  const store = readStore();
  const current = new Set(store[playerKey] ?? []);
  current.add(level);
  store[playerKey] = Array.from(current).sort((a, b) => a - b);
  writeStore(store);
}

export const UNLOCK_CELEBRATION_MS = 3200;
/** スクロール完了後に演出を開始するまでの待ち時間 */
export const UNLOCK_SCROLL_DELAY_MS = 400;
