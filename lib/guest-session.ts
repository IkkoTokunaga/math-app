"use client";

import { computeSessionResult } from "@/lib/compute-session-result";
import { getUnlockedLevel } from "@/lib/levels";
import type {
  GuestCompletedSession,
  GuestInProgressSession,
  GuestQuestionLog,
} from "@/lib/guest/types";
import {
  generateQuestions,
  getCorrectAnswer,
  QUESTIONS_PER_SESSION,
  type Level,
} from "@/lib/questions";
import { calculateQuestionScore } from "@/lib/scoring";
import { readGuestStore, writeGuestStore } from "@/lib/guest-storage";

function newLocalId(): string {
  return crypto.randomUUID();
}

export function getGuestUnlockedLevel(): Level {
  const store = readGuestStore();
  return getUnlockedLevel(
    store.completedSessions.map((session) => ({
      level: session.level,
      stars: session.stars,
      totalScore: session.totalScore,
    })),
  );
}

export function startGuestSession(level: Level): {
  localId: string;
  questions: GuestInProgressSession["questions"];
} {
  const store = readGuestStore();
  const unlocked = getUnlockedLevel(
    store.completedSessions.map((session) => ({
      level: session.level,
      stars: session.stars,
      totalScore: session.totalScore,
    })),
  );

  if (level > unlocked) {
    throw new Error("このレベルはまだ解放されていません");
  }

  const localId = newLocalId();
  const questions = generateQuestions(level, QUESTIONS_PER_SESSION);
  store.inProgress = {
    localId,
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
type SubmitContinue = {
  correct: true;
  message: string;
  completed: false;
  pointsEarned: number;
};
type SubmitDone = {
  correct: true;
  message: string;
  completed: true;
  pointsEarned: number;
  localId: string;
  result: GuestCompletedSession;
};

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

  const question = session.questions[questionIndex];
  if (!question) {
    throw new Error("問題が見つかりません");
  }

  if (session.questionLogs.some((log) => log.questionIndex === questionIndex)) {
    throw new Error("この問題はすでに回答済みです");
  }

  const correctAnswer = getCorrectAnswer(question);
  const key = String(questionIndex);

  if (answer !== correctAnswer) {
    session.attemptCounts[key] = (session.attemptCounts[key] ?? 0) + 1;
    writeGuestStore(store);
    return { correct: false, message: "もう一度考えてみよう！" };
  }

  const incorrectCount = session.attemptCounts[key] ?? 0;
  const { pointsEarned } = calculateQuestionScore(session.level, elapsedSeconds);
  const log: GuestQuestionLog = {
    questionIndex,
    operandA: question.operandA,
    operandB: question.operandB,
    userAnswer: answer,
    correctAnswer,
    incorrectCount,
    pointsEarned,
    isFirstAttemptCorrect: incorrectCount === 0,
  };

  session.questionLogs.push(log);
  const answeredCount = questionIndex + 1;

  if (answeredCount < QUESTIONS_PER_SESSION) {
    writeGuestStore(store);
    return { correct: true, message: "正解！", completed: false, pointsEarned };
  }

  const sameLevelCompleted = store.completedSessions.filter(
    (s) => s.level === session.level,
  );
  const previousCorrect =
    sameLevelCompleted.length > 0
      ? sameLevelCompleted[sameLevelCompleted.length - 1].correctAnswers
      : null;

  const stats = computeSessionResult(session.level, session.questionLogs, previousCorrect);
  const playedAt = new Date().toISOString();

  const completed: GuestCompletedSession = {
    localId,
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
    pointsEarned,
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
