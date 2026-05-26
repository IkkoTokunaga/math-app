"use client";

import { useEffect } from "react";
import { playKeypadDigitSound, resumeKeypadAudioContext } from "@/lib/keypad-sounds";
import { useAppReady } from "@/lib/use-app-ready";

function isKeypadDigitButton(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  const button = target.closest("button.keypad-btn");
  if (!(button instanceof HTMLButtonElement) || button.disabled) {
    return false;
  }

  const digit = button.textContent?.trim();
  return digit != null && /^[0-9]$/.test(digit);
}

function playKeypadDigitFromTarget(target: EventTarget | null): void {
  if (!isKeypadDigitButton(target)) {
    return;
  }

  resumeKeypadAudioContext();
  playKeypadDigitSound();
}

export function KeypadSoundLayer() {
  const appReady = useAppReady();

  useEffect(() => {
    if (!appReady) {
      return;
    }

    let lastTouchPlayAt = 0;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        return;
      }

      lastTouchPlayAt = performance.now();
      playKeypadDigitFromTarget(event.target);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      if (event.pointerType === "touch" && performance.now() - lastTouchPlayAt < 80) {
        return;
      }

      playKeypadDigitFromTarget(event.target);
    };

    document.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart, { capture: true });
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
    };
  }, [appReady]);

  return null;
}
