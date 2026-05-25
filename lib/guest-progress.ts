import { getUnlockProgress, getUnlockedLevel } from "@/lib/levels";
import type { GuestCompletedSession } from "@/lib/guest/types";
import { formatExpression } from "@/lib/operations";
import type { Operation } from "@/lib/operations";
import { DEFAULT_OPERATION } from "@/lib/operations";

function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function calculateLearningStreak(dates: Date[]): number {
  if (dates.length === 0) {
    return 0;
  }

  const uniqueDays = Array.from(
    new Set(dates.map((date) => date.toISOString().slice(0, 10))),
  ).sort();

  let streak = 1;
  for (let i = uniqueDays.length - 1; i > 0; i -= 1) {
    const current = new Date(uniqueDays[i]);
    const previous = new Date(uniqueDays[i - 1]);
    const diffDays = (current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

export function computeGuestProgress(
  completedSessions: GuestCompletedSession[],
  operation: Operation = DEFAULT_OPERATION,
) {
  const scoped = completedSessions.filter(
    (session) => (session.operation ?? DEFAULT_OPERATION) === operation,
  );
  const sorted = [...scoped].sort(
    (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime(),
  );

  const recentSessions = sorted.slice(0, 5).map((session) => ({
    id: session.localId,
    level: session.level,
    correctAnswers: session.correctAnswers,
    accuracy: session.accuracy,
    totalQuestions: session.questionLogs.length,
    stars: session.stars,
    totalScore: session.totalScore,
    playedAt: session.playedAt,
  }));

  const weekStart = getWeekStart(new Date());
  const weeklySessions = sorted.filter(
    (session) => new Date(session.playedAt) >= weekStart,
  );
  const weeklyAverage =
    weeklySessions.length > 0
      ? Math.round(
          weeklySessions.reduce((sum, session) => sum + session.accuracy, 0) /
            weeklySessions.length,
        )
      : null;

  const learningStreak = calculateLearningStreak(
    completedSessions.map((session) => new Date(session.playedAt)),
  );

  const levelSessions = sorted.map((session) => ({
    level: session.level,
    stars: session.stars,
    totalScore: session.totalScore,
    operation: session.operation ?? DEFAULT_OPERATION,
  }));

  const unlockedLevel = getUnlockedLevel(levelSessions, operation);
  const unlockProgress = getUnlockProgress(levelSessions, unlockedLevel, operation);

  const missMap = new Map<string, number>();
  for (const session of sorted) {
    for (const log of session.questionLogs) {
      if (!log.isFirstAttemptCorrect) {
        const label = formatExpression(operation, {
          operandA: log.operandA,
          operandB: log.operandB,
          operandC: log.operandC,
        });
        missMap.set(label, (missMap.get(label) ?? 0) + 1);
      }
    }
  }

  const weakSpots = Array.from(missMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, missCount]) => ({ label, missCount }));

  return {
    operation,
    recentSessions,
    weeklyAverage,
    learningStreak,
    unlockedLevel,
    unlockProgress,
    weakSpots,
  };
}
