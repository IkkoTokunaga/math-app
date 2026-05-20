"use client";

import type { GuestStore, GuestStoreSnapshot } from "@/lib/guest/types";

export const GUEST_STORAGE_KEY = "math-app-guest";
export const GUEST_LABEL = "ゲスト";

function emptyStore(): GuestStore {
  return {
    version: 1,
    completedSessions: [],
  };
}

export function readGuestStore(): GuestStore {
  if (typeof window === "undefined") {
    return emptyStore();
  }

  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) {
      return emptyStore();
    }
    const parsed = JSON.parse(raw) as GuestStore;
    if (parsed.version !== 1) {
      return emptyStore();
    }
    return {
      version: 1,
      completedSessions: parsed.completedSessions ?? [],
      inProgress: parsed.inProgress,
    };
  } catch {
    return emptyStore();
  }
}

export function writeGuestStore(store: GuestStore): void {
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(store));
}

export function getGuestLabel(): string {
  return GUEST_LABEL;
}

export function exportGuestSnapshot(): GuestStoreSnapshot {
  return readGuestStore();
}

export function clearGuestStore(): void {
  localStorage.removeItem(GUEST_STORAGE_KEY);
  localStorage.removeItem("math-app-player-id");
}
