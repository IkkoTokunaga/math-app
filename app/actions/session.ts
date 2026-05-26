"use server";

import { and, desc, eq, isNull, ne, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { questionLogs, sessions } from "@/lib/db/schema";
import type { AttemptCounts, Question } from "@/lib/db/schema";
import { getUnlockedLevel } from "@/lib/levels";
import {
  generateQuestions,
  QUESTIONS_PER_SESSION,
  type Level,
} from "@/lib/questions";
import { generateSubtractionQuestions } from "@/lib/subtraction-questions";
import type { Operation } from "@/lib/operations";
import { DEFAULT_OPERATION, getCorrectAnswerForOperation } from "@/lib/operations";
import {
  aggregateSessionScores,
  buildGrowthMessage,
  calculateBestStreak,
  calculateMaxPossibleSessionScore,
  calculateQuestionScore,
  calculateStars,
  getStreakMilestoneBonusForAnswer,
} from "@/lib/scoring";

function standardSessionFilter(operation: Operation) {
  return and(
    eq(sessions.operation, operation),
    or(eq(sessions.mode, "standard"), isNull(sessions.mode)),
  );
}

async function getCompletedStandardSessions(playerId: string, operation: Operation) {
  return getDb()
    .select({
      level: sessions.level,
      stars: sessions.stars,
      totalScore: sessions.totalScore,
      operation: sessions.operation,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.playerId, playerId),
        eq(sessions.status, "completed"),
        standardSessionFilter(operation),
      ),
    );
}

export async function getPlayerUnlockedLevelAction(
  playerId: string,
  operation: Operation = DEFAULT_OPERATION,
): Promise<Level> {
  const completed = await getCompletedStandardSessions(playerId, operation);

  return getUnlockedLevel(
    completed.map((session) => ({
      level: session.level,
      stars: session.stars ?? 0,
      totalScore: session.totalScore,
      operation: session.operation as Operation,
    })),
    operation,
  );
}

export async function startSessionAction(
  playerId: string,
  level: Level,
  operation: Operation = DEFAULT_OPERATION,
) {
  const completed = await getCompletedStandardSessions(playerId, operation);

  const unlockedLevel = getUnlockedLevel(
    completed.map((session) => ({
      level: session.level,
      stars: session.stars ?? 0,
      totalScore: session.totalScore,
      operation: session.operation as Operation,
    })),
    operation,
  );

  if (level > unlockedLevel) {
    throw new Error("このレベルはまだ解放されていません");
  }

  const questions =
    operation === "subtraction"
      ? generateSubtractionQuestions(level, QUESTIONS_PER_SESSION)
      : generateQuestions(level, QUESTIONS_PER_SESSION);

  const [session] = await getDb()
    .insert(sessions)
    .values({
      playerId,
      level,
      operation,
      status: "in_progress",
      questions,
      attemptCounts: {},
      totalQuestions: QUESTIONS_PER_SESSION,
    })
    .returning();

  return {
    sessionId: session.id,
    questions,
  };
}

export async function submitAnswerAction(
  sessionId: string,
  questionIndex: number,
  answer: number,
  elapsedSeconds: number,
) {
  const [session] = await getDb()
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session || session.status !== "in_progress") {
    throw new Error("セッションが見つかりません");
  }

  const existing = await getDb()
    .select({ id: questionLogs.id })
    .from(questionLogs)
    .where(
      and(
        eq(questionLogs.sessionId, sessionId),
        eq(questionLogs.questionIndex, questionIndex),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error("この問題はすでに回答済みです");
  }

  const questions = session.questions as Question[];
  const question = questions[questionIndex];
  if (!question) {
    throw new Error("問題が見つかりません");
  }

  const operation = (session.operation ?? DEFAULT_OPERATION) as Operation;
  const correctAnswer = getCorrectAnswerForOperation(operation, question);
  const key = String(questionIndex);
  const attemptCounts: AttemptCounts = { ...(session.attemptCounts ?? {}) };

  if (answer !== correctAnswer) {
    attemptCounts[key] = (attemptCounts[key] ?? 0) + 1;
    await getDb()
      .update(sessions)
      .set({ attemptCounts })
      .where(eq(sessions.id, sessionId));

    return {
      correct: false as const,
      message: "もう一度考えてみよう！",
    };
  }

  const incorrectCount = attemptCounts[key] ?? 0;
  const isFirstAttemptCorrect = incorrectCount === 0;
  const level = session.level as Level;
  const { basePoints, timeBonus, pointsEarned } = calculateQuestionScore(
    level,
    elapsedSeconds,
  );

  const priorLogs = await getDb()
    .select({ isFirstAttemptCorrect: questionLogs.isFirstAttemptCorrect })
    .from(questionLogs)
    .where(eq(questionLogs.sessionId, sessionId))
    .orderBy(questionLogs.questionIndex);
  const streakBonusEarned = getStreakMilestoneBonusForAnswer(
    priorLogs.map((log) => log.isFirstAttemptCorrect),
    isFirstAttemptCorrect,
  );

  await getDb().insert(questionLogs).values({
    sessionId,
    questionIndex,
    operandA: question.operandA,
    operandB: question.operandB,
    operandC: question.operandC ?? null,
    userAnswer: answer,
    correctAnswer,
    incorrectCount,
    pointsEarned,
    isFirstAttemptCorrect,
  });

  const answeredCount = questionIndex + 1;
  if (answeredCount < QUESTIONS_PER_SESSION) {
    return {
      correct: true as const,
      message: "正解！",
      completed: false as const,
      basePoints,
      timeBonus,
      pointsEarned,
      streakBonusEarned,
    };
  }

  const result = await finalizeSession(sessionId);
  return {
    correct: true as const,
    message: "正解！",
    completed: true as const,
    basePoints,
    timeBonus,
    pointsEarned,
    streakBonusEarned,
    result,
  };
}

async function finalizeSession(sessionId: string) {
  const logs = await getDb()
    .select()
    .from(questionLogs)
    .where(eq(questionLogs.sessionId, sessionId))
    .orderBy(questionLogs.questionIndex);

  const [session] = await getDb()
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new Error("セッションが見つかりません");
  }

  const level = session.level as Level;
  const operation = (session.operation ?? DEFAULT_OPERATION) as Operation;
  const firstAttemptResults = logs.map((log) => log.isFirstAttemptCorrect);
  const correctAnswers = firstAttemptResults.filter(Boolean).length;
  const accuracy = Math.round((correctAnswers / QUESTIONS_PER_SESSION) * 100);
  const { baseScore, bonusScore, totalScore } = aggregateSessionScores(level, logs);
  const maxPossible = calculateMaxPossibleSessionScore(level, QUESTIONS_PER_SESSION);
  const stars = calculateStars(totalScore, maxPossible);
  const bestStreak = calculateBestStreak(firstAttemptResults);

  const previous = await getDb()
    .select({ correctAnswers: sessions.correctAnswers })
    .from(sessions)
    .where(
      and(
        eq(sessions.playerId, session.playerId),
        eq(sessions.level, session.level),
        eq(sessions.operation, operation),
        eq(sessions.status, "completed"),
      ),
    )
    .orderBy(desc(sessions.playedAt))
    .limit(1);

  const growthMessage = buildGrowthMessage(
    correctAnswers,
    previous[0]?.correctAnswers ?? null,
  );

  await getDb()
    .update(sessions)
    .set({
      status: "completed",
      correctAnswers,
      accuracy,
      stars,
      baseScore,
      bonusScore,
      totalScore,
      bestStreak,
      completedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId));

  return {
    sessionId,
    correctAnswers,
    totalQuestions: QUESTIONS_PER_SESSION,
    accuracy,
    stars,
    baseScore,
    bonusScore,
    totalScore,
    bestStreak,
    growthMessage,
  };
}

export async function getSessionResultAction(sessionId: string) {
  const [session] = await getDb()
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session || session.status !== "completed") {
    return null;
  }

  const operation = (session.operation ?? DEFAULT_OPERATION) as Operation;

  const previous = await getDb()
    .select({ correctAnswers: sessions.correctAnswers })
    .from(sessions)
    .where(
      and(
        eq(sessions.playerId, session.playerId),
        eq(sessions.level, session.level),
        eq(sessions.operation, operation),
        eq(sessions.status, "completed"),
        ne(sessions.id, sessionId),
      ),
    )
    .orderBy(desc(sessions.playedAt))
    .limit(1);

  const logs = await getDb()
    .select({
      questionIndex: questionLogs.questionIndex,
      operandA: questionLogs.operandA,
      operandB: questionLogs.operandB,
      operandC: questionLogs.operandC,
      pointsEarned: questionLogs.pointsEarned,
      isFirstAttemptCorrect: questionLogs.isFirstAttemptCorrect,
    })
    .from(questionLogs)
    .where(eq(questionLogs.sessionId, sessionId))
    .orderBy(questionLogs.questionIndex);

  return {
    sessionId: session.id,
    operation,
    level: session.level,
    correctAnswers: session.correctAnswers ?? 0,
    totalQuestions: session.totalQuestions,
    accuracy: session.accuracy ?? 0,
    stars: session.stars ?? 0,
    baseScore: session.baseScore ?? 0,
    bonusScore: session.bonusScore ?? 0,
    totalScore: session.totalScore ?? 0,
    bestStreak: session.bestStreak ?? 0,
    growthMessage: buildGrowthMessage(
      session.correctAnswers ?? 0,
      previous[0]?.correctAnswers ?? null,
    ),
    questionLogs: logs,
  };
}

export async function redirectToResultAction(sessionId: string) {
  redirect(`/result/${sessionId}`);
}

export async function validatePlaySessionAction(
  sessionId: string,
): Promise<{ valid: boolean }> {
  const [session] = await getDb()
    .select({ status: sessions.status, mode: sessions.mode })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session || session.status !== "in_progress") {
    return { valid: false };
  }

  const mode = session.mode ?? "standard";
  return { valid: mode === "standard" };
}
