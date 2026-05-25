"use client";

import type { Level } from "@/lib/questions";
import type { Operation } from "@/lib/operations";
import { DEFAULT_OPERATION } from "@/lib/operations";
import { getPendingUnlockCelebration } from "@/lib/unlock-celebration-core";

const STORAGE_KEY = "math-app-unlock-celebrations";
const LEGACY_GUEST_KEY = "guest";

type CelebrationStore = Record<string, number[]>;

function celebrationKey(operation: Operation): string {
  return operation === "subtraction" ? "guest:subtraction" : "guest:addition";
}

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

function readLevelsForOperation(store: CelebrationStore, operation: Operation): Level[] {
  const key = celebrationKey(operation);
  if (store[key]) {
    return store[key] as Level[];
  }
  if (operation === DEFAULT_OPERATION && store[LEGACY_GUEST_KEY]) {
    return store[LEGACY_GUEST_KEY] as Level[];
  }
  return [];
}

export function readGuestCelebratedLevels(
  operation: Operation = DEFAULT_OPERATION,
): Level[] {
  return readLevelsForOperation(readStore(), operation);
}

export function markGuestUnlockCelebrated(
  level: Level,
  operation: Operation = DEFAULT_OPERATION,
): void {
  if (level <= 1) {
    return;
  }

  const store = readStore();
  const key = celebrationKey(operation);
  const current = new Set(readLevelsForOperation(store, operation));
  current.add(level);
  store[key] = Array.from(current).sort((a, b) => a - b);
  writeStore(store);
}

export function setGuestCelebratedLevels(
  levels: number[],
  operation: Operation = DEFAULT_OPERATION,
): void {
  const store = readStore();
  store[celebrationKey(operation)] = [...levels].sort((a, b) => a - b);
  writeStore(store);
}

export function getPendingGuestUnlockCelebration(
  unlockedLevel: Level,
  operation: Operation = DEFAULT_OPERATION,
): Level | null {
  return getPendingUnlockCelebration(
    readGuestCelebratedLevels(operation),
    unlockedLevel,
  );
}
