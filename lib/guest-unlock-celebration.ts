"use client";

import type { Level } from "@/lib/questions";
import { getPendingUnlockCelebration } from "@/lib/unlock-celebration-core";

const STORAGE_KEY = "math-app-unlock-celebrations";
const GUEST_KEY = "guest";

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

export function readGuestCelebratedLevels(): Level[] {
  return (readStore()[GUEST_KEY] ?? []) as Level[];
}

export function markGuestUnlockCelebrated(level: Level): void {
  if (level <= 1) {
    return;
  }

  const store = readStore();
  const current = new Set(store[GUEST_KEY] ?? []);
  current.add(level);
  store[GUEST_KEY] = Array.from(current).sort((a, b) => a - b);
  writeStore(store);
}

export function setGuestCelebratedLevels(levels: number[]): void {
  const store = readStore();
  store[GUEST_KEY] = [...levels].sort((a, b) => a - b);
  writeStore(store);
}

export function getPendingGuestUnlockCelebration(unlockedLevel: Level): Level | null {
  return getPendingUnlockCelebration(readGuestCelebratedLevels(), unlockedLevel);
}
