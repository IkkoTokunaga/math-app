import type { Level } from "@/lib/questions";
import type { GuestCompletedSession } from "@/lib/guest/types";
import { readGuestStore, writeGuestStore } from "@/lib/guest-storage";

import { setGuestCelebratedLevels } from "@/lib/guest-unlock-celebration";

function makePerfectSession(level: Level): GuestCompletedSession {
  return {
    localId: crypto.randomUUID(),
    operation: "addition",
    level,
    playedAt: new Date().toISOString(),
    correctAnswers: 10,
    accuracy: 100,
    stars: 5,
    baseScore: level * 100,
    bonusScore: level * 100 + 60,
    totalScore: level * 200 + 60,
    bestStreak: 10,
    growthMessage: "dev unlock",
    questionLogs: Array.from({ length: 10 }, (_, questionIndex) => ({
      questionIndex,
      operandA: 1,
      operandB: 1,
      userAnswer: 2,
      correctAnswer: 2,
      incorrectCount: 0,
      pointsEarned: level * 20,
      isFirstAttemptCorrect: true,
    })),
  };
}

/** 開発用: Lv1〜(target-1) をクリア済みにし、target の解放演出だけ未表示にする */
export function applyDevUnlock(targetLevel: Level): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const completedSessions: GuestCompletedSession[] = [];
  for (let level = 1; level < targetLevel; level += 1) {
    completedSessions.push(makePerfectSession(level as Level));
  }

  const store = readGuestStore();
  store.completedSessions = [
    ...completedSessions,
    ...store.completedSessions.filter(
      (session) => session.level >= targetLevel,
    ),
  ];
  delete store.inProgress;
  writeGuestStore(store);

  const celebrated: number[] = [];
  for (let level = 2; level < targetLevel; level += 1) {
    celebrated.push(level);
  }

  setGuestCelebratedLevels(celebrated);
}

export function getDevUnlockFromSearch(search: string): Level | null {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const value = new URLSearchParams(search).get("devUnlock");
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 2 || parsed > 10) {
    return null;
  }

  return parsed as Level;
}
