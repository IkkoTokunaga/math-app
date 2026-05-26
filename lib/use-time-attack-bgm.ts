"use client";

import { useLayoutEffect, useRef } from "react";
import { unlockAudioPlayback } from "@/lib/audio-unlock";
import {
  clearTimeAttackBgmState,
  getCurrentTimeAttackBgmTrack,
  getTimeAttackBossKey,
  isTimeAttackBgmPlaying,
  loadTimeAttackBgmState,
  playTimeAttackBgm,
  primeTimeAttackBgm,
  resumePendingTimeAttackBgm,
  saveTimeAttackBgmState,
  stopTimeAttackBgm,
  TimeAttackBgmQueue,
  TIME_ATTACK_BGM_START_DELAY_MS,
  TIME_ATTACK_BGM_TRACKS,
} from "@/lib/time-attack-bgm";
import { primeTimeAttackSounds } from "@/lib/time-attack-sounds";
import type { TimeAttackState } from "@/lib/time-attack";
import { useSoundEnabled } from "@/lib/use-sound-enabled";

function persistBgmState(
  sessionId: string,
  queue: TimeAttackBgmQueue,
  bossKey: string | null,
): void {
  saveTimeAttackBgmState(sessionId, {
    remaining: queue.getRemaining(),
    currentTrack: getCurrentTimeAttackBgmTrack(),
    bossKey,
  });
}

export function useTimeAttackBgm(
  sessionId: string,
  arenaState: TimeAttackState,
): void {
  const soundEnabled = useSoundEnabled();
  const queueRef = useRef<TimeAttackBgmQueue | null>(null);
  const bossKeyRef = useRef<string | null>(null);
  const bossKey = getTimeAttackBossKey(arenaState);

  useLayoutEffect(() => {
    primeTimeAttackBgm();
    primeTimeAttackSounds();

    const saved = loadTimeAttackBgmState(sessionId);
    queueRef.current = new TimeAttackBgmQueue(
      TIME_ATTACK_BGM_TRACKS,
      saved?.remaining ?? null,
    );
    bossKeyRef.current = null;

    const unlockUntilPlaying = () => {
      void unlockAudioPlayback().then(() => {
        if (isTimeAttackBgmPlaying()) {
          return;
        }

        resumePendingTimeAttackBgm();
      });
    };

    document.addEventListener("keydown", unlockUntilPlaying, { capture: true });

    return () => {
      document.removeEventListener("keydown", unlockUntilPlaying, { capture: true });

      if (queueRef.current != null) {
        persistBgmState(sessionId, queueRef.current, bossKeyRef.current);
      }
      stopTimeAttackBgm();
    };
  }, [sessionId]);

  useLayoutEffect(() => {
    if (!soundEnabled) {
      stopTimeAttackBgm();
      return;
    }

    const queue = queueRef.current;
    if (queue == null) {
      return;
    }

    if (bossKeyRef.current === bossKey) {
      if (!isTimeAttackBgmPlaying()) {
        resumePendingTimeAttackBgm();
      }
      return;
    }

    const saved = loadTimeAttackBgmState(sessionId);
    const isResumeSameBoss =
      saved?.bossKey === bossKey && saved.currentTrack != null;

    bossKeyRef.current = bossKey;

    const track = isResumeSameBoss
      ? saved.currentTrack!
      : queue.next(getCurrentTimeAttackBgmTrack());

    persistBgmState(sessionId, queue, bossKey);

    const timer = window.setTimeout(() => {
      playTimeAttackBgm(track);
      resumePendingTimeAttackBgm();
    }, TIME_ATTACK_BGM_START_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [bossKey, sessionId, soundEnabled]);
}

export function endTimeAttackBgmSession(sessionId: string): void {
  clearTimeAttackBgmState(sessionId);
  stopTimeAttackBgm();
}
