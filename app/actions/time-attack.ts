"use server";

import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { questionLogs, sessions } from "@/lib/db/schema";
import type { Question, TimeAttackState as DbTimeAttackState } from "@/lib/db/schema";
import { generateQuestions, getCorrectAnswer, type Level } from "@/lib/questions";
import {
  createDevTimeAttackState,
  type DevTimeAttackStart,
} from "@/lib/dev-time-attack-setup";
import {
  applyWaveDamage,
  createInitialTimeAttackState,
  getBossLabel,
  type TimeAttackState,
} from "@/lib/time-attack";
import {
  calculateTimeAttackQuestionScore,
  MAX_MISTAKES,
  WAVE_QUESTION_COUNT,
} from "@/lib/time-attack-scoring";

function parseTimeAttackState(raw: DbTimeAttackState | null): TimeAttackState {
  if (!raw) {
    throw new Error("タイムアタック状態が見つかりません");
  }
  return {
    currentLevel: raw.currentLevel as Level,
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
  };
}

function serializeTimeAttackState(state: TimeAttackState): DbTimeAttackState {
  return { ...state };
}

async function findInProgressTimeAttackSession(playerId: string) {
  const [session] = await getDb()
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.playerId, playerId),
        eq(sessions.mode, "time_attack"),
        eq(sessions.status, "in_progress"),
      ),
    )
    .orderBy(desc(sessions.playedAt))
    .limit(1);

  return session ?? null;
}

async function abandonInProgressTimeAttackSessions(playerId: string) {
  const inProgress = await findInProgressTimeAttackSession(playerId);
  if (!inProgress?.timeAttackState) {
    return;
  }

  const state = parseTimeAttackState(inProgress.timeAttackState);
  await getDb()
    .update(sessions)
    .set({
      status: "completed",
      timeAttackState: serializeTimeAttackState({
        ...state,
        phase: "failed",
      }),
      completedAt: new Date(),
      stars: null,
      correctAnswers: null,
      accuracy: null,
      baseScore: null,
      bonusScore: null,
      bestStreak: null,
    })
    .where(eq(sessions.id, inProgress.id));
}

async function finalizeTimeAttackFailure(
  sessionId: string,
  state: TimeAttackState,
) {
  const failedState: TimeAttackState = {
    ...state,
    phase: "failed",
    failReason: "mistakes",
  };

  await getDb()
    .update(sessions)
    .set({
      status: "completed",
      totalScore: failedState.totalScore,
      level: failedState.currentLevel,
      timeAttackState: serializeTimeAttackState(failedState),
      completedAt: new Date(),
      stars: null,
      correctAnswers: null,
      accuracy: null,
      baseScore: null,
      bonusScore: null,
      bestStreak: null,
    })
    .where(eq(sessions.id, sessionId));

  return failedState;
}

async function finalizeTimeAttackClear(sessionId: string, state: TimeAttackState) {
  const clearedState: TimeAttackState = {
    ...state,
    phase: "cleared",
  };

  await getDb()
    .update(sessions)
    .set({
      status: "completed",
      totalScore: clearedState.totalScore,
      level: clearedState.currentLevel,
      timeAttackState: serializeTimeAttackState(clearedState),
      completedAt: new Date(),
      stars: null,
      correctAnswers: null,
      accuracy: null,
      baseScore: null,
      bonusScore: null,
      bestStreak: null,
    })
    .where(eq(sessions.id, sessionId));

  return clearedState;
}

async function completeWave(
  sessionId: string,
  state: TimeAttackState,
  waveScore: number,
) {
  const resolution = applyWaveDamage(state, waveScore);

  if (resolution.kind === "continue") {
    const questions = generateQuestions(
      resolution.state.currentLevel,
      WAVE_QUESTION_COUNT,
    );

    await getDb()
      .update(sessions)
      .set({
        level: resolution.state.currentLevel,
        questions,
        totalQuestions: WAVE_QUESTION_COUNT,
        timeAttackState: serializeTimeAttackState(resolution.state),
        totalScore: resolution.state.totalScore,
      })
      .where(eq(sessions.id, sessionId));

    return {
      waveComplete: true as const,
      waveScore,
      bossDefeated: false as const,
      hpRemaining: resolution.state.oniHpRemaining,
      hpMax: resolution.state.oniHpMax,
      timeAttackState: resolution.state,
      questions,
      sessionEnded: false as const,
    };
  }

  if (resolution.cleared) {
    await finalizeTimeAttackClear(sessionId, resolution.state);
    return {
      waveComplete: true as const,
      waveScore,
      bossDefeated: true as const,
      defeatBonus: resolution.defeatBonus,
      cleared: true as const,
      timeAttackState: resolution.state,
      sessionEnded: true as const,
    };
  }

  const questions = generateQuestions(
    resolution.state.currentLevel,
    WAVE_QUESTION_COUNT,
  );

  await getDb()
    .update(sessions)
    .set({
      level: resolution.state.currentLevel,
      questions,
      totalQuestions: WAVE_QUESTION_COUNT,
      timeAttackState: serializeTimeAttackState(resolution.state),
      totalScore: resolution.state.totalScore,
    })
    .where(eq(sessions.id, sessionId));

  return {
    waveComplete: true as const,
    waveScore,
    bossDefeated: true as const,
    defeatBonus: resolution.defeatBonus,
    cleared: false as const,
    hpRemaining: resolution.state.oniHpRemaining,
    hpMax: resolution.state.oniHpMax,
    timeAttackState: resolution.state,
    questions,
    sessionEnded: false as const,
  };
}

function buildSessionPayload(
  sessionId: string,
  questions: Question[],
  state: TimeAttackState,
) {
  return {
    sessionId,
    questions,
    timeAttackState: state,
    bossLabel: getBossLabel(state),
  };
}

export async function getTimeAttackResumeInfoAction(playerId: string) {
  const session = await findInProgressTimeAttackSession(playerId);
  if (!session?.timeAttackState) {
    return null;
  }

  const state = parseTimeAttackState(session.timeAttackState);
  if (state.phase !== "wave_active") {
    return null;
  }

  return {
    sessionId: session.id,
    bossLabel: getBossLabel(state),
    currentLevel: state.currentLevel,
    enmaNumber: state.enmaNumber,
  };
}

export async function resumeTimeAttackSessionAction(playerId: string) {
  const session = await findInProgressTimeAttackSession(playerId);
  if (!session?.timeAttackState) {
    return null;
  }

  const state = parseTimeAttackState(session.timeAttackState);
  if (state.phase !== "wave_active") {
    return null;
  }

  return buildSessionPayload(session.id, session.questions as Question[], state);
}

export async function startTimeAttackSessionAction(
  playerId: string,
  forceNew = false,
  devStart: DevTimeAttackStart | null = null,
) {
  const devStartActive =
    devStart !== null && process.env.NODE_ENV === "development";

  const existing = await findInProgressTimeAttackSession(playerId);
  if (existing && !forceNew && !devStartActive) {
    return {
      needsConfirm: true as const,
      existingSessionId: existing.id,
    };
  }

  if (forceNew || devStartActive) {
    await abandonInProgressTimeAttackSessions(playerId);
  }

  const initialState = devStartActive
    ? createDevTimeAttackState(devStart)
    : createInitialTimeAttackState();
  const questions = generateQuestions(initialState.currentLevel, WAVE_QUESTION_COUNT);

  const [session] = await getDb()
    .insert(sessions)
    .values({
      playerId,
      level: initialState.currentLevel,
      mode: "time_attack",
      status: "in_progress",
      questions,
      attemptCounts: {},
      totalQuestions: WAVE_QUESTION_COUNT,
      timeAttackState: serializeTimeAttackState(initialState),
      totalScore: 0,
    })
    .returning();

  return buildSessionPayload(session.id, questions, initialState);
}

export async function submitTimeAttackAnswerAction(
  sessionId: string,
  answer: number,
  elapsedSeconds: number,
) {
  const [session] = await getDb()
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session || session.status !== "in_progress" || session.mode !== "time_attack") {
    throw new Error("セッションが見つかりません");
  }

  const state = parseTimeAttackState(session.timeAttackState ?? null);

  if (state.phase !== "wave_active") {
    throw new Error("セッションは終了しています");
  }

  const waveQuestionIndex = state.waveQuestionIndex;
  const globalQuestionIndex = state.globalQuestionIndex;

  const existing = await getDb()
    .select({ id: questionLogs.id })
    .from(questionLogs)
    .where(
      and(
        eq(questionLogs.sessionId, sessionId),
        eq(questionLogs.questionIndex, globalQuestionIndex),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error("この問題はすでに回答済みです");
  }

  const questions = session.questions as Question[];
  const question = questions[waveQuestionIndex];
  if (!question) {
    throw new Error("問題が見つかりません");
  }

  const correctAnswer = getCorrectAnswer(question);
  const level = state.currentLevel;

  if (answer !== correctAnswer) {
    await getDb().insert(questionLogs).values({
      sessionId,
      questionIndex: globalQuestionIndex,
      operandA: question.operandA,
      operandB: question.operandB,
      operandC: question.operandC ?? null,
      userAnswer: answer,
      correctAnswer,
      incorrectCount: 1,
      pointsEarned: 0,
      isFirstAttemptCorrect: false,
    });

    const mistakeCount = state.mistakeCount + 1;
    const nextWaveIndex = waveQuestionIndex + 1;
    const nextGlobalIndex = globalQuestionIndex + 1;

    if (mistakeCount >= MAX_MISTAKES) {
      const failedState = await finalizeTimeAttackFailure(sessionId, {
        ...state,
        mistakeCount,
        globalQuestionIndex: nextGlobalIndex,
      });
      return {
        correct: false as const,
        sessionEnded: true as const,
        mistakeCount,
        timeAttackState: failedState,
      };
    }

    const updatedState: TimeAttackState = {
      ...state,
      mistakeCount,
      waveQuestionIndex: nextWaveIndex,
      globalQuestionIndex: nextGlobalIndex,
    };

    if (nextWaveIndex >= WAVE_QUESTION_COUNT) {
      const waveResult = await completeWave(sessionId, updatedState, updatedState.waveScoreAccumulated);
      return {
        correct: false as const,
        mistakeCount,
        ...waveResult,
      };
    }

    await getDb()
      .update(sessions)
      .set({
        timeAttackState: serializeTimeAttackState(updatedState),
        totalScore: updatedState.totalScore,
      })
      .where(eq(sessions.id, sessionId));

    return {
      correct: false as const,
      sessionEnded: false as const,
      mistakeCount,
      timeAttackState: updatedState,
      waveComplete: false as const,
    };
  }

  const { basePoints, timeBonus, pointsEarned } = calculateTimeAttackQuestionScore(
    level,
    elapsedSeconds,
    state.timeLimitSeconds,
    state.timeBonusMultiplier,
  );

  await getDb().insert(questionLogs).values({
    sessionId,
    questionIndex: globalQuestionIndex,
    operandA: question.operandA,
    operandB: question.operandB,
    operandC: question.operandC ?? null,
    userAnswer: answer,
    correctAnswer,
    incorrectCount: 0,
    pointsEarned,
    isFirstAttemptCorrect: true,
  });

  const waveScoreAccumulated = state.waveScoreAccumulated + pointsEarned;
  const totalScore = state.totalScore + pointsEarned;
  const nextWaveIndex = waveQuestionIndex + 1;
  const nextGlobalIndex = globalQuestionIndex + 1;

  const updatedState: TimeAttackState = {
    ...state,
    waveScoreAccumulated,
    totalScore,
    waveQuestionIndex: nextWaveIndex,
    globalQuestionIndex: nextGlobalIndex,
  };

  if (nextWaveIndex >= WAVE_QUESTION_COUNT) {
    const waveResult = await completeWave(sessionId, updatedState, waveScoreAccumulated);
    return {
      correct: true as const,
      basePoints,
      timeBonus,
      pointsEarned,
      ...waveResult,
    };
  }

  await getDb()
    .update(sessions)
    .set({
      timeAttackState: serializeTimeAttackState(updatedState),
      totalScore,
    })
    .where(eq(sessions.id, sessionId));

  return {
    correct: true as const,
    basePoints,
    timeBonus,
    pointsEarned,
    sessionEnded: false as const,
    waveComplete: false as const,
    timeAttackState: updatedState,
  };
}

export async function getTimeAttackResultAction(sessionId: string) {
  const [session] = await getDb()
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (
    !session ||
    session.mode !== "time_attack" ||
    session.status !== "completed" ||
    !session.timeAttackState
  ) {
    return null;
  }

  const state = parseTimeAttackState(session.timeAttackState);

  return {
    sessionId: session.id,
    totalScore: session.totalScore ?? state.totalScore,
    phase: state.phase,
    failReason: state.failReason,
    currentLevel: state.currentLevel,
    enmaNumber: state.enmaNumber,
    bossesDefeated: state.bossesDefeated,
    bossLabel: getBossLabel(state),
    cleared: state.phase === "cleared",
  };
}

export async function redirectToTimeAttackResultAction(sessionId: string) {
  redirect(`/result/time-attack/${sessionId}`);
}
