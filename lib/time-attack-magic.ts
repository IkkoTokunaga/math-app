import { SCORE_TIME_GRACE_SECONDS } from "@/lib/scoring";
import { getRemainingBonusSeconds } from "@/lib/time-attack-scoring";
import type { Level } from "@/lib/questions";
import { isTimeMagicLevel } from "@/lib/time-attack";

export const TIME_MAGIC_COUNTDOWN_SECONDS = 10;

/** タイムボーナス切れから時間の魔法カウントダウンが始まる経過秒 */
export function getTimeMagicStartElapsed(timeLimitSeconds: number): number {
  return timeLimitSeconds + SCORE_TIME_GRACE_SECONDS;
}

export function isTimeMagicCountdownActive(
  elapsedSeconds: number,
  timeLimitSeconds: number,
): boolean {
  return getRemainingBonusSeconds(elapsedSeconds, timeLimitSeconds) <= 0;
}

/** 時間の魔法の残り秒。未発動なら null、ペナルティ直前は 0 */
export function getTimeMagicSecondsRemaining(
  elapsedSeconds: number,
  timeLimitSeconds: number,
): number | null {
  if (!isTimeMagicCountdownActive(elapsedSeconds, timeLimitSeconds)) {
    return null;
  }
  const magicStart = getTimeMagicStartElapsed(timeLimitSeconds);
  const countdownElapsed = elapsedSeconds - magicStart;
  if (countdownElapsed < 0) {
    return null;
  }
  return Math.max(0, TIME_MAGIC_COUNTDOWN_SECONDS - countdownElapsed);
}

/** 丸ゲージ表示開始からの残り秒（幻影着弾後） */
export function getTimeMagicSecondsRemainingFromGaugeElapsed(
  gaugeElapsedSeconds: number,
): number {
  return Math.max(0, TIME_MAGIC_COUNTDOWN_SECONDS - gaugeElapsedSeconds);
}

export function shouldApplyTimeMagicPenalty(
  level: Level,
  elapsedSeconds: number,
  timeLimitSeconds: number,
  penaltyAtQuestionIndex: number | undefined,
  globalQuestionIndex: number,
): boolean {
  if (!isTimeMagicLevel(level)) {
    return false;
  }
  if (penaltyAtQuestionIndex === globalQuestionIndex) {
    return false;
  }
  const remaining = getTimeMagicSecondsRemaining(elapsedSeconds, timeLimitSeconds);
  return remaining !== null && remaining <= 0;
}

export function shouldApplyTimeMagicPenaltyFromGauge(
  level: Level,
  gaugeElapsedSeconds: number,
  penaltyAtQuestionIndex: number | undefined,
  globalQuestionIndex: number,
): boolean {
  if (!isTimeMagicLevel(level)) {
    return false;
  }
  if (penaltyAtQuestionIndex === globalQuestionIndex) {
    return false;
  }
  return getTimeMagicSecondsRemainingFromGaugeElapsed(gaugeElapsedSeconds) <= 0;
}
