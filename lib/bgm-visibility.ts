"use client";

import {
  pauseHomeBgmForBackground,
  resumeHomeBgmFromBackground,
} from "@/lib/home-bgm";
import {
  pauseQuizBgmForBackground,
  resumeQuizBgmFromBackground,
} from "@/lib/quiz-bgm";
import {
  pauseTimeAttackBgmForBackground,
  resumeTimeAttackBgmFromBackground,
} from "@/lib/time-attack-bgm";

export function pauseAllBgmForBackground(): void {
  pauseHomeBgmForBackground();
  pauseQuizBgmForBackground();
  pauseTimeAttackBgmForBackground();
}

export function resumeAllBgmFromBackground(): void {
  resumeHomeBgmFromBackground();
  resumeQuizBgmFromBackground();
  resumeTimeAttackBgmFromBackground();
}

export function initBgmVisibility(): () => void {
  const onVisibilityChange = () => {
    if (document.hidden) {
      pauseAllBgmForBackground();
      return;
    }

    resumeAllBgmFromBackground();
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
