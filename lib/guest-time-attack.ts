"use client";

import type { Question } from "@/lib/db/schema";
import type {
  GuestCompletedTimeAttackSession,
  GuestQuestionLog,
  GuestTimeAttackInProgress,
} from "@/lib/guest/types";
import { readGuestStore, writeGuestStore } from "@/lib/guest-storage";
import {
  DEFAULT_OPERATION,
  getCorrectAnswerForOperation,
  type Operation,
} from "@/lib/operations";
import { generateSubtractionTimeAttackQuestions } from "@/lib/subtraction-time-attack-questions";
import { generateTimeAttackQuestions } from "@/lib/time-attack-questions";
import {
  applyWaveDamage,
  createInitialTimeAttackState,
  getBossLabel,
  isTimeMagicLevel,
  type TimeAttackState,
} from "@/lib/time-attack";
import { shouldApplyTimeMagicPenaltyFromGauge } from "@/lib/time-attack-magic";
import {
  calculateTimeAttackQuestionScore,
  MAX_MISTAKES,
  WAVE_QUESTION_COUNT,
} from "@/lib/time-attack-scoring";

function newLocalId(): string {
  return crypto.randomUUID();
}

function clearTimeMagicPenalty(state: TimeAttackState): TimeAttackState {
  const { timeMagicPenaltyAtQuestionIndex: _removed, ...rest } = state;
  return rest;
}

function generateTimeAttackQuestionsForOperation(
  operation: Operation,
  level: TimeAttackState["currentLevel"],
  count: number,
): Question[] {
  return operation === "subtraction"
    ? generateSubtractionTimeAttackQuestions(level, count)
    : generateTimeAttackQuestions(level, count);
}

function getInProgress(
  operation: Operation,
): GuestTimeAttackInProgress | null {
  const store = readGuestStore();
  return store.timeAttackInProgress?.[operation] ?? null;
}

function isResumableTimeAttackState(state: TimeAttackState): boolean {
  return state.phase === "wave_active" && state.mistakeCount < MAX_MISTAKES;
}

export function getGuestTimeAttackResumeInfo(
  operation: Operation = DEFAULT_OPERATION,
): { localId: string; bossLabel: string } | null {
  const session = getInProgress(operation);
  if (!session || !isResumableTimeAttackState(session.timeAttackState)) {
    return null;
  }

  return {
    localId: session.localId,
    bossLabel: getBossLabel(session.timeAttackState),
  };
}

function abandonInProgress(operation: Operation): void {
  const store = readGuestStore();
  if (!store.timeAttackInProgress?.[operation]) {
    return;
  }

  const session = store.timeAttackInProgress[operation]!;
  const failedState: TimeAttackState = {
    ...session.timeAttackState,
    phase: "failed",
  };

  const completed: GuestCompletedTimeAttackSession = {
    localId: session.localId,
    operation,
    playedAt: new Date().toISOString(),
    totalScore: failedState.totalScore,
    level: failedState.currentLevel,
    timeAttackState: failedState,
    questionLogs: session.questionLogs,
  };

  store.completedTimeAttackSessions = [
    completed,
    ...(store.completedTimeAttackSessions ?? []),
  ];
  delete store.timeAttackInProgress[operation];
  if (Object.keys(store.timeAttackInProgress).length === 0) {
    delete store.timeAttackInProgress;
  }
  writeGuestStore(store);
}

function saveInProgress(session: GuestTimeAttackInProgress): void {
  const store = readGuestStore();
  store.timeAttackInProgress = {
    ...store.timeAttackInProgress,
    [session.operation]: session,
  };
  writeGuestStore(store);
}

function finalizeCompleted(
  session: GuestTimeAttackInProgress,
  state: TimeAttackState,
): GuestCompletedTimeAttackSession {
  const store = readGuestStore();
  const completed: GuestCompletedTimeAttackSession = {
    localId: session.localId,
    operation: session.operation,
    playedAt: new Date().toISOString(),
    totalScore: state.totalScore,
    level: state.currentLevel,
    timeAttackState: state,
    questionLogs: session.questionLogs,
  };

  store.completedTimeAttackSessions = [
    completed,
    ...(store.completedTimeAttackSessions ?? []),
  ];

  if (store.timeAttackInProgress?.[session.operation]?.localId === session.localId) {
    delete store.timeAttackInProgress[session.operation];
    if (Object.keys(store.timeAttackInProgress).length === 0) {
      delete store.timeAttackInProgress;
    }
  }

  writeGuestStore(store);
  return completed;
}

function completeGuestWave(
  session: GuestTimeAttackInProgress,
  state: TimeAttackState,
  waveScore: number,
) {
  const resolution = applyWaveDamage(state, waveScore);

  if (resolution.kind === "continue") {
    const questions = generateTimeAttackQuestionsForOperation(
      session.operation,
      resolution.state.currentLevel,
      WAVE_QUESTION_COUNT,
    );
    session.questions = questions;
    session.timeAttackState = resolution.state;
    saveInProgress(session);

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
    const clearedState: TimeAttackState = {
      ...resolution.state,
      phase: "cleared",
    };
    finalizeCompleted(session, clearedState);
    return {
      waveComplete: true as const,
      waveScore,
      bossDefeated: true as const,
      defeatBonus: resolution.defeatBonus,
      cleared: true as const,
      timeAttackState: clearedState,
      sessionEnded: true as const,
    };
  }

  const questions = generateTimeAttackQuestionsForOperation(
    session.operation,
    resolution.state.currentLevel,
    WAVE_QUESTION_COUNT,
  );
  session.questions = questions;
  session.timeAttackState = resolution.state;
  saveInProgress(session);

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

export function startGuestTimeAttackSession(
  operation: Operation = DEFAULT_OPERATION,
  forceNew = true,
): {
  localId: string;
  questions: Question[];
  timeAttackState: TimeAttackState;
  bossLabel: string;
} {
  if (forceNew && getInProgress(operation)) {
    abandonInProgress(operation);
  }

  const initialState = createInitialTimeAttackState();
  const questions = generateTimeAttackQuestionsForOperation(
    operation,
    initialState.currentLevel,
    WAVE_QUESTION_COUNT,
  );
  const localId = newLocalId();
  const session: GuestTimeAttackInProgress = {
    localId,
    operation,
    questions,
    questionLogs: [],
    timeAttackState: initialState,
    startedAt: new Date().toISOString(),
  };
  saveInProgress(session);

  return {
    localId,
    questions,
    timeAttackState: initialState,
    bossLabel: getBossLabel(initialState),
  };
}

export function submitGuestTimeAttackAnswer(
  localId: string,
  answer: number,
  elapsedSeconds: number,
) {
  const store = readGuestStore();
  const operationEntries = Object.entries(store.timeAttackInProgress ?? {}) as Array<
    [Operation, GuestTimeAttackInProgress]
  >;
  const entry = operationEntries.find(([, session]) => session.localId === localId);
  if (!entry) {
    throw new Error("セッションが見つかりません");
  }

  const [, session] = entry;
  const state = session.timeAttackState;
  if (state.phase !== "wave_active") {
    throw new Error("セッションは終了しています");
  }

  const waveQuestionIndex = state.waveQuestionIndex;
  const globalQuestionIndex = state.globalQuestionIndex;

  if (session.questionLogs.some((log) => log.questionIndex === globalQuestionIndex)) {
    throw new Error("この問題はすでに回答済みです");
  }

  const question = session.questions[waveQuestionIndex];
  if (!question) {
    throw new Error("問題が見つかりません");
  }

  const operation = session.operation;
  const correctAnswer = getCorrectAnswerForOperation(operation, question);
  const level = state.currentLevel;

  if (answer !== correctAnswer) {
    const log: GuestQuestionLog = {
      questionIndex: globalQuestionIndex,
      operandA: question.operandA,
      operandB: question.operandB,
      ...(question.operandC != null ? { operandC: question.operandC } : {}),
      userAnswer: answer,
      correctAnswer,
      incorrectCount: 1,
      pointsEarned: 0,
      isFirstAttemptCorrect: false,
    };
    session.questionLogs.push(log);

    const mistakeCount = state.mistakeCount + 1;
    const nextWaveIndex = waveQuestionIndex + 1;
    const nextGlobalIndex = globalQuestionIndex + 1;

    if (mistakeCount >= MAX_MISTAKES) {
      const failedState: TimeAttackState = {
        ...state,
        mistakeCount,
        globalQuestionIndex: nextGlobalIndex,
        phase: "failed",
        failReason: "mistakes",
      };
      finalizeCompleted(session, failedState);
      return {
        correct: false as const,
        sessionEnded: true as const,
        mistakeCount,
        timeAttackState: failedState,
      };
    }

    const updatedState: TimeAttackState = clearTimeMagicPenalty({
      ...state,
      mistakeCount,
      waveQuestionIndex: nextWaveIndex,
      globalQuestionIndex: nextGlobalIndex,
    });

    if (nextWaveIndex >= WAVE_QUESTION_COUNT) {
      session.timeAttackState = updatedState;
      const waveResult = completeGuestWave(
        session,
        updatedState,
        updatedState.waveScoreAccumulated,
      );
      return {
        correct: false as const,
        mistakeCount,
        ...waveResult,
      };
    }

    session.timeAttackState = updatedState;
    saveInProgress(session);

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

  const log: GuestQuestionLog = {
    questionIndex: globalQuestionIndex,
    operandA: question.operandA,
    operandB: question.operandB,
    ...(question.operandC != null ? { operandC: question.operandC } : {}),
    userAnswer: answer,
    correctAnswer,
    incorrectCount: 0,
    pointsEarned,
    isFirstAttemptCorrect: true,
  };
  session.questionLogs.push(log);

  const waveScoreAccumulated = state.waveScoreAccumulated + pointsEarned;
  const totalScore = state.totalScore + pointsEarned;
  const nextWaveIndex = waveQuestionIndex + 1;
  const nextGlobalIndex = globalQuestionIndex + 1;

  const updatedState: TimeAttackState = clearTimeMagicPenalty({
    ...state,
    waveScoreAccumulated,
    totalScore,
    waveQuestionIndex: nextWaveIndex,
    globalQuestionIndex: nextGlobalIndex,
  });

  if (nextWaveIndex >= WAVE_QUESTION_COUNT) {
    session.timeAttackState = updatedState;
    const waveResult = completeGuestWave(session, updatedState, waveScoreAccumulated);
    return {
      correct: true as const,
      basePoints,
      timeBonus,
      pointsEarned,
      ...waveResult,
    };
  }

  session.timeAttackState = updatedState;
  saveInProgress(session);

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

export function applyGuestTimeMagicHeartLoss(
  localId: string,
  gaugeElapsedSeconds: number,
) {
  const store = readGuestStore();
  const operationEntries = Object.entries(store.timeAttackInProgress ?? {}) as Array<
    [Operation, GuestTimeAttackInProgress]
  >;
  const entry = operationEntries.find(([, session]) => session.localId === localId);
  if (!entry) {
    throw new Error("セッションが見つかりません");
  }

  const [, session] = entry;
  const state = session.timeAttackState;

  if (state.phase !== "wave_active" || !isTimeMagicLevel(state.currentLevel)) {
    return { applied: false as const };
  }

  const globalQuestionIndex = state.globalQuestionIndex;

  if (
    !shouldApplyTimeMagicPenaltyFromGauge(
      state.currentLevel,
      gaugeElapsedSeconds,
      state.timeMagicPenaltyAtQuestionIndex,
      globalQuestionIndex,
    )
  ) {
    return { applied: false as const };
  }

  const mistakeCount = state.mistakeCount + 1;
  const penalizedState: TimeAttackState = {
    ...state,
    mistakeCount,
    timeMagicPenaltyAtQuestionIndex: globalQuestionIndex,
  };

  if (mistakeCount >= MAX_MISTAKES) {
    const failedState: TimeAttackState = {
      ...penalizedState,
      phase: "failed",
      failReason: "mistakes",
    };
    finalizeCompleted(session, failedState);
    return {
      applied: true as const,
      sessionEnded: true as const,
      mistakeCount,
      timeAttackState: failedState,
    };
  }

  session.timeAttackState = penalizedState;
  saveInProgress(session);

  return {
    applied: true as const,
    sessionEnded: false as const,
    mistakeCount,
    timeAttackState: penalizedState,
  };
}

export function getGuestTimeAttackCompletedSession(
  localId: string,
): GuestCompletedTimeAttackSession | null {
  const store = readGuestStore();
  return (
    store.completedTimeAttackSessions?.find((session) => session.localId === localId) ??
    null
  );
}
