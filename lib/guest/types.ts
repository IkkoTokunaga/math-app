import type { Question } from "@/lib/db/schema";
import type { Operation } from "@/lib/operations";
import type { Level } from "@/lib/questions";
import type { TimeAttackState } from "@/lib/time-attack";

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
  operation: Operation;
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
  operation: Operation;
  level: Level;
  questions: Question[];
  attemptCounts: Record<string, number>;
  questionLogs: GuestQuestionLog[];
  startedAt: string;
};

export type GuestTimeAttackInProgress = {
  localId: string;
  operation: Operation;
  questions: Question[];
  questionLogs: GuestQuestionLog[];
  timeAttackState: TimeAttackState;
  startedAt: string;
};

export type GuestCompletedTimeAttackSession = {
  localId: string;
  operation: Operation;
  playedAt: string;
  totalScore: number;
  level: Level;
  timeAttackState: TimeAttackState;
  questionLogs: GuestQuestionLog[];
};

export type GuestStore = {
  version: 1;
  completedSessions: GuestCompletedSession[];
  inProgress?: GuestInProgressSession;
  timeAttackInProgress?: Partial<Record<Operation, GuestTimeAttackInProgress>>;
  completedTimeAttackSessions?: GuestCompletedTimeAttackSession[];
};

export type GuestStoreSnapshot = GuestStore;
