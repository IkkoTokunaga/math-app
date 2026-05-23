import { SCORE_TIME_GRACE_SECONDS } from "@/lib/scoring";
import type { Level } from "@/lib/questions";

export const ONI_HP_RATIO = 0.85;
export const DEFEAT_BONUS_RATIO = 0.5;
export const MAX_MISTAKES = 3;
export const RED_ALERT_REMAINING_SECONDS = 5;

export function getRemainingBonusSeconds(
  elapsedSeconds: number,
  timeLimitSeconds: number,
): number {
  const safeElapsed = Math.max(0, Math.min(elapsedSeconds, 300));
  const adjusted = Math.max(0, safeElapsed - SCORE_TIME_GRACE_SECONDS);
  const elapsedWholeSeconds = Math.floor(adjusted);
  return Math.max(0, timeLimitSeconds - elapsedWholeSeconds);
}

export function isQuestionTimedOut(
  elapsedSeconds: number,
  timeLimitSeconds: number,
): boolean {
  return getRemainingBonusSeconds(elapsedSeconds, timeLimitSeconds) <= 0;
}

export function calculateTimeAttackQuestionScore(
  level: Level,
  elapsedSeconds: number,
  timeLimitSeconds: number,
  timeBonusMultiplier: number,
): {
  basePoints: number;
  timeBonus: number;
  pointsEarned: number;
} {
  const basePoints = level * 10;
  const remainingSeconds = getRemainingBonusSeconds(elapsedSeconds, timeLimitSeconds);
  const timeBonus =
    remainingSeconds > 0 ? level * remainingSeconds * timeBonusMultiplier : 0;

  return {
    basePoints,
    timeBonus,
    pointsEarned: basePoints + timeBonus,
  };
}

export function maxQuestionScoreForWave(
  level: Level,
  timeLimitSeconds: number,
  timeBonusMultiplier: number,
): number {
  return level * 10 + level * timeLimitSeconds * timeBonusMultiplier;
}

export function calculateWaveMaxScore(
  level: Level,
  timeLimitSeconds: number,
  timeBonusMultiplier: number,
  questionCount = 10,
): number {
  return maxQuestionScoreForWave(level, timeLimitSeconds, timeBonusMultiplier) * questionCount;
}

export function calculateOniMaxHp(
  level: Level,
  timeLimitSeconds: number,
  timeBonusMultiplier: number,
  questionCount = 10,
): number {
  const waveMax = calculateWaveMaxScore(
    level,
    timeLimitSeconds,
    timeBonusMultiplier,
    questionCount,
  );
  return Math.floor(waveMax * ONI_HP_RATIO);
}

export function calculateDefeatBonus(waveScore: number): number {
  return Math.floor(waveScore * DEFEAT_BONUS_RATIO);
}
