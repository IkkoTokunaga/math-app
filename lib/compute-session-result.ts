import type { GuestQuestionLog } from "@/lib/guest/types";
import {
  aggregateSessionScores,
  buildGrowthMessage,
  calculateBestStreak,
  calculateMaxPossibleSessionScore,
  calculateStars,
} from "@/lib/scoring";
import { QUESTIONS_PER_SESSION, type Level } from "@/lib/questions";

export type SessionResultStats = {
  correctAnswers: number;
  accuracy: number;
  stars: number;
  baseScore: number;
  bonusScore: number;
  totalScore: number;
  bestStreak: number;
  growthMessage: string;
};

export function computeSessionResult(
  level: Level,
  questionLogs: GuestQuestionLog[],
  previousCorrectAnswers: number | null,
): SessionResultStats {
  const firstAttemptResults = questionLogs.map((log) => log.isFirstAttemptCorrect);
  const correctAnswers = firstAttemptResults.filter(Boolean).length;
  const accuracy = Math.round((correctAnswers / QUESTIONS_PER_SESSION) * 100);
  const { baseScore, bonusScore, totalScore } = aggregateSessionScores(level, questionLogs);
  const maxPossible = calculateMaxPossibleSessionScore(level, QUESTIONS_PER_SESSION);
  const stars = calculateStars(totalScore, maxPossible);
  const bestStreak = calculateBestStreak(firstAttemptResults);
  const growthMessage = buildGrowthMessage(correctAnswers, previousCorrectAnswers);

  return {
    correctAnswers,
    accuracy,
    stars,
    baseScore,
    bonusScore,
    totalScore,
    bestStreak,
    growthMessage,
  };
}
