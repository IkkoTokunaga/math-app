"use client";

const STORAGE_KEY = "math-app:sound-enabled";

let soundEnabled = true;
let initialized = false;
const listeners = new Set<() => void>();

function readStored(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      return true;
    }

    return stored === "true";
  } catch {
    return true;
  }
}

function applyStoredSettings(): void {
  soundEnabled = readStored();
  initialized = true;
}

if (typeof window !== "undefined") {
  applyStoredSettings();
}

export function initSoundSettings(): void {
  if (typeof window === "undefined" || initialized) {
    return;
  }

  applyStoredSettings();
}

export function isSoundEnabled(): boolean {
  initSoundSettings();
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  initSoundSettings();

  if (soundEnabled === enabled) {
    return;
  }

  soundEnabled = enabled;

  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // ignore storage failures
  }

  listeners.forEach((listener) => listener());
}

export function subscribeSoundSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
