"use client";

import { useEffect } from "react";
import {
  didPointerTapMove,
  playButtonSoundForTarget,
  resolveButtonSoundSrc,
  shouldPlayButtonSound,
  TIME_ATTACK_RESUME_SOUND_SRC,
  TIME_ATTACK_START_SOUND_SRC,
  unlockButtonSounds,
} from "@/lib/button-sounds";
import { prepareTimeAttackBgmEntry } from "@/lib/time-attack-bgm";
import { unlockHomeBgm } from "@/lib/home-bgm";
import { unlockQuizBgm } from "@/lib/quiz-bgm";
import { useAppReady } from "@/lib/use-app-ready";

export function ButtonSoundLayer() {
  const appReady = useAppReady();

  useEffect(() => {
    if (!appReady) {
      return;
    }

    let tapStartX = 0;
    let tapStartY = 0;
    let tapTarget: EventTarget | null = null;
    let tapMoved = false;
    let playedForLastTap = false;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      playedForLastTap = false;
      tapMoved = false;
      tapStartX = event.clientX;
      tapStartY = event.clientY;
      tapTarget = event.target;
      unlockButtonSounds();
      unlockHomeBgm();
      unlockQuizBgm();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (tapMoved) {
        return;
      }

      tapMoved = didPointerTapMove(tapStartX, tapStartY, event.clientX, event.clientY);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.button !== 0 || tapMoved || playedForLastTap) {
        return;
      }

      if (!shouldPlayButtonSound(tapTarget)) {
        return;
      }

      const soundSrc = resolveButtonSoundSrc(tapTarget);
      if (
        soundSrc === TIME_ATTACK_START_SOUND_SRC ||
        soundSrc === TIME_ATTACK_RESUME_SOUND_SRC
      ) {
        prepareTimeAttackBgmEntry();
      }

      playButtonSoundForTarget(tapTarget);
      playedForLastTap = true;
    };

    const onClick = (event: MouseEvent) => {
      if (!event.isTrusted || playedForLastTap) {
        return;
      }

      if (!shouldPlayButtonSound(event.target)) {
        return;
      }

      const soundSrc = resolveButtonSoundSrc(event.target);
      if (
        soundSrc === TIME_ATTACK_START_SOUND_SRC ||
        soundSrc === TIME_ATTACK_RESUME_SOUND_SRC
      ) {
        prepareTimeAttackBgmEntry();
      }

      playButtonSoundForTarget(event.target);
    };

    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    document.addEventListener("pointermove", onPointerMove, { capture: true });
    document.addEventListener("pointerup", onPointerUp, { capture: true });
    document.addEventListener("click", onClick, { capture: true });

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
      document.removeEventListener("pointermove", onPointerMove, { capture: true });
      document.removeEventListener("pointerup", onPointerUp, { capture: true });
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, [appReady]);

  return null;
}
