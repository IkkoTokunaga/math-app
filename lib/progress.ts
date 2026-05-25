import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import { questionLogs, sessions } from "./db/schema";
import { getUnlockProgress, getUnlockedLevel } from "./levels";
import { formatExpression } from "./operations";
import type { Operation } from "./operations";
import { DEFAULT_OPERATION } from "./operations";

function standardSessionFilter(operation: Operation) {
  return and(
    eq(sessions.operation, operation),
    or(eq(sessions.mode, "standard"), isNull(sessions.mode)),
  );
}

export async function getProgressData(
  playerId: string,
  operation: Operation = DEFAULT_OPERATION,
) {
  const completedSessions = await getDb()
    .select({
      id: sessions.id,
      level: sessions.level,
      stars: sessions.stars,
      correctAnswers: sessions.correctAnswers,
      accuracy: sessions.accuracy,
      totalQuestions: sessions.totalQuestions,
      totalScore: sessions.totalScore,
      playedAt: sessions.playedAt,
      operation: sessions.operation,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.playerId, playerId),
        eq(sessions.status, "completed"),
        standardSessionFilter(operation),
      ),
    )
    .orderBy(desc(sessions.playedAt));

  const recentSessions = completedSessions.slice(0, 5).map((session) => ({
    ...session,
  }));

  const weekStart = getWeekStart(new Date());
  const weeklySessions = completedSessions.filter(
    (session) => session.playedAt >= weekStart,
  );
  const weeklyAverage =
    weeklySessions.length > 0
      ? Math.round(
          weeklySessions.reduce((sum, session) => sum + (session.accuracy ?? 0), 0) /
            weeklySessions.length,
        )
      : null;

  const allOperationSessions = await getDb()
    .select({ playedAt: sessions.playedAt })
    .from(sessions)
    .where(
      and(
        eq(sessions.playerId, playerId),
        eq(sessions.status, "completed"),
        or(eq(sessions.mode, "standard"), isNull(sessions.mode)),
      ),
    )
    .orderBy(desc(sessions.playedAt));

  const learningStreak = calculateLearningStreak(
    allOperationSessions.map((session) => session.playedAt),
  );

  const levelSessions = completedSessions.map((session) => ({
    level: session.level,
    stars: session.stars ?? 0,
    totalScore: session.totalScore,
    operation: session.operation as Operation,
  }));
  const unlockedLevel = getUnlockedLevel(levelSessions, operation);
  const unlockProgress = getUnlockProgress(levelSessions, unlockedLevel, operation);

  const weakSpots = await getDb()
    .select({
      operandA: questionLogs.operandA,
      operandB: questionLogs.operandB,
      operandC: questionLogs.operandC,
      missCount: sql<number>`count(*)`.mapWith(Number),
    })
    .from(questionLogs)
    .innerJoin(sessions, eq(questionLogs.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.playerId, playerId),
        eq(questionLogs.isFirstAttemptCorrect, false),
        standardSessionFilter(operation),
      ),
    )
    .groupBy(questionLogs.operandA, questionLogs.operandB, questionLogs.operandC)
    .orderBy(desc(sql`count(*)`))
    .limit(3);

  return {
    operation,
    recentSessions,
    weeklyAverage,
    learningStreak,
    unlockedLevel,
    unlockProgress,
    weakSpots: weakSpots.map((spot) => ({
      label: formatExpression(operation, {
        operandA: spot.operandA,
        operandB: spot.operandB,
        operandC: spot.operandC ?? undefined,
      }),
      missCount: spot.missCount,
    })),
  };
}

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
