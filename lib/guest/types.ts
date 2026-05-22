import type { Question } from "@/lib/db/schema";
import type { Level } from "@/lib/questions";

export type GuestQuestionLog = {
  questionIndex: number;
  operandA: number;
  operandB: number;
  operandC?: number;
  userAnswer: number;
  correctAnswer: number;
  incorrectCount: number;
  pointsEarned: number;
  isFirstAttemptCorrect: boolean;
};

export type GuestCompletedSession = {
  localId: string;
  level: Level;
  playedAt: string;
  correctAnswers: number;
  accuracy: number;
  stars: number;
  baseScore: number;
  bonusScore: number;
  totalScore: number;
  bestStreak: number;
  growthMessage: string;
  questionLogs: GuestQuestionLog[];
};

export type GuestInProgressSession = {
  localId: string;
  level: Level;
  questions: Question[];
  attemptCounts: Record<string, number>;
  questionLogs: GuestQuestionLog[];
  startedAt: string;
};

export type GuestStore = {
  version: 1;
  completedSessions: GuestCompletedSession[];
  inProgress?: GuestInProgressSession;
};

export type GuestStoreSnapshot = GuestStore;
