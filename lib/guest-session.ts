"use client";

import { computeSessionResult } from "@/lib/compute-session-result";
import { getUnlockedLevel } from "@/lib/levels";
import type {
  GuestCompletedSession,
  GuestInProgressSession,
  GuestQuestionLog,
} from "@/lib/guest/types";
import type { Operation } from "@/lib/operations";
import { DEFAULT_OPERATION, getCorrectAnswerForOperation } from "@/lib/operations";
import {
  generateQuestions,
  QUESTIONS_PER_SESSION,
  type Level,
} from "@/lib/questions";
import { generateSubtractionQuestions } from "@/lib/subtraction-questions";
import {
  calculateQuestionScore,
  getStreakMilestoneBonusForAnswer,
} from "@/lib/scoring";
import { readGuestStore, writeGuestStore } from "@/lib/guest-storage";

function newLocalId(): string {
  return crypto.randomUUID();
}

function mapGuestCompletedSessions(
  sessions: GuestCompletedSession[],
  operation: Operation,
) {
  return sessions
    .filter((session) => (session.operation ?? DEFAULT_OPERATION) === operation)
    .map((session) => ({
      level: session.level,
      stars: session.stars,
      totalScore: session.totalScore,
      operation: session.operation ?? DEFAULT_OPERATION,
    }));
}

export function getGuestUnlockedLevel(operation: Operation = DEFAULT_OPERATION): Level {
  const store = readGuestStore();
  return getUnlockedLevel(mapGuestCompletedSessions(store.completedSessions, operation), operation);
}

export function isGuestStandardSessionActive(localId: string): boolean {
  const session = readGuestStore().inProgress;
  return session?.localId === localId;
}

export function startGuestSession(
  level: Level,
  operation: Operation = DEFAULT_OPERATION,
): {
  localId: string;
  questions: GuestInProgressSession["questions"];
} {
  const store = readGuestStore();
  const unlocked = getUnlockedLevel(
    mapGuestCompletedSessions(store.completedSessions, operation),
    operation,
  );

  if (level > unlocked) {
    throw new Error("このレベルはまだ解放されていません");
  }

  const localId = newLocalId();
  const questions =
    operation === "subtraction"
      ? generateSubtractionQuestions(level, QUESTIONS_PER_SESSION)
      : generateQuestions(level, QUESTIONS_PER_SESSION);
  store.inProgress = {
    localId,
    operation,
    level,
    questions,
    attemptCounts: {},
    questionLogs: [],
    startedAt: new Date().toISOString(),
  };
  writeGuestStore(store);

  return { localId, questions };
}

type SubmitWrong = { correct: false; message: string };
type SubmitCorrectPayload = {
  basePoints: number;
  timeBonus: number;
  pointsEarned: number;
  streakBonusEarned: number;
};

type SubmitContinue = {
  correct: true;
  message: string;
  completed: false;
} & SubmitCorrectPayload;

type SubmitDone = {
  correct: true;
  message: string;
  completed: true;
  localId: string;
  result: GuestCompletedSession;
} & SubmitCorrectPayload;

export function submitGuestAnswer(
  localId: string,
  questionIndex: number,
  answer: number,
  elapsedSeconds: number,
): SubmitWrong | SubmitContinue | SubmitDone {
  const store = readGuestStore();
  const session = store.inProgress;

  if (!session || session.localId !== localId) {
    throw new Error("セッションが見つかりません");
  }

  const operation = session.operation ?? DEFAULT_OPERATION;
  const question = session.questions[questionIndex];
  if (!question) {
    throw new Error("問題が見つかりません");
  }

  if (session.questionLogs.some((log) => log.questionIndex === questionIndex)) {
    throw new Error("この問題はすでに回答済みです");
  }

  const correctAnswer = getCorrectAnswerForOperation(operation, question);
  const key = String(questionIndex);

  if (answer !== correctAnswer) {
    session.attemptCounts[key] = (session.attemptCounts[key] ?? 0) + 1;
    writeGuestStore(store);
    return { correct: false, message: "もう一度考えてみよう！" };
  }

  const incorrectCount = session.attemptCounts[key] ?? 0;
  const isFirstAttemptCorrect = incorrectCount === 0;
  const { basePoints, timeBonus, pointsEarned } = calculateQuestionScore(
    session.level,
    elapsedSeconds,
  );
  const streakBonusEarned = getStreakMilestoneBonusForAnswer(
    session.questionLogs.map((entry) => entry.isFirstAttemptCorrect),
    isFirstAttemptCorrect,
  );
  const log: GuestQuestionLog = {
    questionIndex,
    operandA: question.operandA,
    operandB: question.operandB,
    ...(question.operandC != null ? { operandC: question.operandC } : {}),
    userAnswer: answer,
    correctAnswer,
    incorrectCount,
    pointsEarned,
    isFirstAttemptCorrect,
  };

  session.questionLogs.push(log);
  const answeredCount = questionIndex + 1;

  if (answeredCount < QUESTIONS_PER_SESSION) {
    writeGuestStore(store);
    return {
      correct: true,
      message: "正解！",
      completed: false,
      basePoints,
      timeBonus,
      pointsEarned,
      streakBonusEarned,
    };
  }

  const sameLevelCompleted = store.completedSessions.filter(
    (s) =>
      s.level === session.level &&
      (s.operation ?? DEFAULT_OPERATION) === operation,
  );
  const previousCorrect =
    sameLevelCompleted.length > 0
      ? sameLevelCompleted[sameLevelCompleted.length - 1].correctAnswers
      : null;

  const stats = computeSessionResult(session.level, session.questionLogs, previousCorrect);
  const playedAt = new Date().toISOString();

  const completed: GuestCompletedSession = {
    localId,
    operation,
    level: session.level,
    playedAt,
    questionLogs: session.questionLogs,
    ...stats,
  };

  store.completedSessions.unshift(completed);
  delete store.inProgress;
  writeGuestStore(store);

  return {
    correct: true,
    message: "正解！",
    completed: true,
    basePoints,
    timeBonus,
    pointsEarned,
    streakBonusEarned,
    localId,
    result: completed,
  };
}

export function getGuestCompletedSession(
  localId: string,
): GuestCompletedSession | null {
  const store = readGuestStore();
  return store.completedSessions.find((session) => session.localId === localId) ?? null;
}
