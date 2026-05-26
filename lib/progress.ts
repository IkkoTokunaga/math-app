import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import { questionLogs, sessions } from "./db/schema";
import type { TimeAttackState as DbTimeAttackState } from "./db/schema";
import { getUnlockProgress, getUnlockedLevel } from "./levels";
import { formatExpression } from "./operations";
import type { Operation } from "./operations";
import { DEFAULT_OPERATION } from "./operations";
import { getBossLabel, type TimeAttackState } from "./time-attack";

function standardSessionFilter(operation: Operation) {
  return and(
    eq(sessions.operation, operation),
    or(eq(sessions.mode, "standard"), isNull(sessions.mode)),
  );
}

export type StandardRecentSession = {
  id: string;
  mode: "standard";
  level: number;
  correctAnswers: number | null;
  accuracy: number | null;
  totalQuestions: number | null;
  stars: number | null;
  totalScore: number | null;
  playedAt: string | Date;
};

export type TimeAttackRecentSession = {
  id: string;
  mode: "time_attack";
  level: number;
  totalScore: number | null;
  playedAt: string | Date;
  bossLabel: string;
  bossesDefeated: number;
  cleared: boolean;
  failReason?: "mistakes";
};

export type RecentSession = StandardRecentSession | TimeAttackRecentSession;

export type ProgressData = {
  operation: Operation;
  recentSessions: RecentSession[];
  timeAttackBestScore: number | null;
  weeklyAverage: number | null;
  learningStreak: number;
  unlockedLevel: number;
  unlockProgress: {
    nextLevel: number | null;
    currentStar4: number;
    requiredStar4: number;
    hasPerfect: boolean;
  };
  weakSpots: Array<{ label: string; missCount: number }>;
};

function parseTimeAttackStateForProgress(
  raw: DbTimeAttackState,
): TimeAttackState {
  return {
    currentLevel: raw.currentLevel as TimeAttackState["currentLevel"],
    enmaNumber: raw.enmaNumber,
    oniHpRemaining: raw.oniHpRemaining,
    oniHpMax: raw.oniHpMax,
    mistakeCount: raw.mistakeCount,
    waveQuestionIndex: raw.waveQuestionIndex,
    globalQuestionIndex: raw.globalQuestionIndex ?? 0,
    waveScoreAccumulated: raw.waveScoreAccumulated,
    totalScore: raw.totalScore,
    timeLimitSeconds: raw.timeLimitSeconds,
    timeBonusMultiplier: raw.timeBonusMultiplier,
    bossesDefeated: raw.bossesDefeated,
    phase: raw.phase,
    failReason: raw.failReason === "mistakes" ? "mistakes" : undefined,
    timeMagicPenaltyAtQuestionIndex: raw.timeMagicPenaltyAtQuestionIndex,
  };
}

function mapRecentSession(session: {
  id: string;
  level: number;
  mode: string | null;
  stars: number | null;
  correctAnswers: number | null;
  accuracy: number | null;
  totalQuestions: number | null;
  totalScore: number | null;
  playedAt: Date;
  timeAttackState: DbTimeAttackState | null;
}): RecentSession | null {
  if (session.mode === "time_attack") {
    if (!session.timeAttackState) {
      return null;
    }
    const state = parseTimeAttackStateForProgress(session.timeAttackState);
    return {
      id: session.id,
      mode: "time_attack",
      level: session.level,
      totalScore: session.totalScore ?? state.totalScore,
      playedAt: session.playedAt,
      bossLabel: getBossLabel(state),
      bossesDefeated: state.bossesDefeated,
      cleared: state.phase === "cleared",
      failReason: state.failReason,
    };
  }

  return {
    id: session.id,
    mode: "standard",
    level: session.level,
    correctAnswers: session.correctAnswers,
    accuracy: session.accuracy,
    totalQuestions: session.totalQuestions,
    stars: session.stars,
    totalScore: session.totalScore,
    playedAt: session.playedAt,
  };
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

  const allCompletedSessions = await getDb()
    .select({
      id: sessions.id,
      level: sessions.level,
      mode: sessions.mode,
      stars: sessions.stars,
      correctAnswers: sessions.correctAnswers,
      accuracy: sessions.accuracy,
      totalQuestions: sessions.totalQuestions,
      totalScore: sessions.totalScore,
      playedAt: sessions.playedAt,
      timeAttackState: sessions.timeAttackState,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.playerId, playerId),
        eq(sessions.status, "completed"),
        eq(sessions.operation, operation),
      ),
    )
    .orderBy(desc(sessions.playedAt));

  const recentSessions = allCompletedSessions
    .map(mapRecentSession)
    .filter((session): session is RecentSession => session !== null)
    .slice(0, 5);

  const timeAttackBestScore = allCompletedSessions.reduce<number | null>((best, session) => {
    if (session.mode !== "time_attack") {
      return best;
    }
    const score = session.totalScore ?? session.timeAttackState?.totalScore ?? null;
    if (score === null) {
      return best;
    }
    return best === null ? score : Math.max(best, score);
  }, null);

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
    timeAttackBestScore,
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
