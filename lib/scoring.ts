import type { Level } from "@/lib/questions";

export const SCORE_TIME_LIMIT_SECONDS = 10;
export const STAR_COUNT = 5;
/** この割合以上で星5（満点は公表しない） */
export const STAR_FULL_SCORE_RATIO = 0.9;
/** レベル解放: 星4の必要回数（満点は即解放） */
export const STAR4_UNLOCK_COUNT = 3;

export const STREAK_MILESTONES: Record<number, number> = {
  3: 5,
  5: 10,
  7: 15,
  10: 20,
  15: 25,
  20: 30,
};

export type QuestionScoreBreakdown = {
  basePoints: number;
  timeBonus: number;
  pointsEarned: number;
};

export function calculateQuestionScore(
  level: Level,
  elapsedSeconds: number,
): QuestionScoreBreakdown {
  const safeElapsed = Math.max(0, Math.min(elapsedSeconds, 300));
  const basePoints = level * 10;
  const elapsedWholeSeconds = Math.floor(safeElapsed);
  const remainingSeconds = Math.max(0, SCORE_TIME_LIMIT_SECONDS - elapsedWholeSeconds);
  const timeBonus =
    elapsedWholeSeconds < SCORE_TIME_LIMIT_SECONDS ? level * remainingSeconds : 0;

  return {
    basePoints,
    timeBonus,
    pointsEarned: basePoints + timeBonus,
  };
}

/** 1問あたりの理論最大（基本 + 即答ボーナス） */
export function maxQuestionScore(level: Level): number {
  return level * 10 + level * SCORE_TIME_LIMIT_SECONDS;
}

/** セッションの理論最大得点（問題点 + 取りうる連続正解ボーナス） */
export function calculateMaxPossibleSessionScore(
  level: Level,
  totalQuestions: number,
): number {
  const maxQuestionTotal = maxQuestionScore(level) * totalQuestions;
  let maxStreakBonus = 0;
  for (let streak = 1; streak <= totalQuestions; streak += 1) {
    const milestone = STREAK_MILESTONES[streak];
    if (milestone) {
      maxStreakBonus += milestone;
    }
  }
  return maxQuestionTotal + maxStreakBonus;
}

/**
 * 獲得点数 ÷ 理論最大に対する割合で星0〜5。
 * 90%以上で星5。未満は 0〜90% を均等5分割（18%刻みで星0〜4）。
 */
export function calculateStars(totalScore: number, maxPossibleScore: number): number {
  if (maxPossibleScore <= 0) {
    return 0;
  }
  const ratio = totalScore / maxPossibleScore;
  if (ratio >= STAR_FULL_SCORE_RATIO) {
    return STAR_COUNT;
  }
  return Math.min(STAR_COUNT - 1, Math.floor((ratio / STAR_FULL_SCORE_RATIO) * STAR_COUNT));
}

/** 星Nに必要な最低得点（N=0は0、N=5は理論最大の90%） */
export function getStarScoreThreshold(starCount: number, maxPossibleScore: number): number {
  if (starCount <= 0) {
    return 0;
  }
  if (starCount >= STAR_COUNT) {
    return Math.ceil(maxPossibleScore * STAR_FULL_SCORE_RATIO);
  }
  return Math.ceil(maxPossibleScore * (starCount / STAR_COUNT) * STAR_FULL_SCORE_RATIO);
}

export type StarProgressInfo = {
  stars: number;
  nextStars: number | null;
  pointsToNextStar: number | null;
  tierProgressPercent: number;
};

export function getStarProgressInfo(
  totalScore: number,
  maxPossibleScore: number,
): StarProgressInfo {
  const stars = calculateStars(totalScore, maxPossibleScore);

  if (stars >= STAR_COUNT) {
    return {
      stars,
      nextStars: null,
      pointsToNextStar: null,
      tierProgressPercent: 100,
    };
  }

  const nextStars = stars + 1;
  const tierStartScore = getStarScoreThreshold(stars, maxPossibleScore);
  const tierEndScore = getStarScoreThreshold(nextStars, maxPossibleScore);
  const tierRange = tierEndScore - tierStartScore;
  const tierProgressPercent =
    tierRange > 0
      ? Math.min(100, Math.max(0, ((totalScore - tierStartScore) / tierRange) * 100))
      : 0;

  return {
    stars,
    nextStars,
    pointsToNextStar: Math.max(0, tierEndScore - totalScore),
    tierProgressPercent,
  };
}

export function calculateCurrentFirstAttemptStreak(
  priorFirstAttemptResults: boolean[],
): number {
  let streak = 0;
  for (const isCorrect of priorFirstAttemptResults) {
    if (isCorrect) {
      streak += 1;
    } else {
      streak = 0;
    }
  }
  return streak;
}

/** 今回の正解で付与される連続正解マイルストーンボーナス（初回正解時のみ） */
export function getStreakMilestoneBonusForAnswer(
  priorFirstAttemptResults: boolean[],
  isFirstAttemptCorrect: boolean,
): number {
  if (!isFirstAttemptCorrect) {
    return 0;
  }
  const streak = calculateCurrentFirstAttemptStreak(priorFirstAttemptResults) + 1;
  return STREAK_MILESTONES[streak] ?? 0;
}

export function calculateStreakBonus(firstAttemptResults: boolean[]): number {
  let streak = 0;
  let bonus = 0;

  for (const isCorrect of firstAttemptResults) {
    if (isCorrect) {
      streak += 1;
      const milestoneBonus = STREAK_MILESTONES[streak];
      if (milestoneBonus) {
        bonus += milestoneBonus;
      }
    } else {
      streak = 0;
    }
  }

  return bonus;
}

export function calculateBestStreak(firstAttemptResults: boolean[]): number {
  let streak = 0;
  let best = 0;

  for (const isCorrect of firstAttemptResults) {
    if (isCorrect) {
      streak += 1;
      best = Math.max(best, streak);
    } else {
      streak = 0;
    }
  }

  return best;
}

export function aggregateSessionScores(
  level: Level,
  questionLogs: Array<{ pointsEarned: number; isFirstAttemptCorrect: boolean }>,
): {
  baseScore: number;
  bonusScore: number;
  totalScore: number;
} {
  const questionScoreSum = questionLogs.reduce((sum, log) => sum + log.pointsEarned, 0);
  const baseScore = level * 10 * questionLogs.length;
  const timeBonus = questionScoreSum - baseScore;
  const streakBonus = calculateStreakBonus(
    questionLogs.map((log) => log.isFirstAttemptCorrect),
  );

  return {
    baseScore,
    bonusScore: timeBonus + streakBonus,
    totalScore: questionScoreSum + streakBonus,
  };
}

export type SessionScoreDetails = {
  baseScore: number;
  timeBonus: number;
  streakBonus: number;
  totalScore: number;
};

export function getSessionScoreDetails(
  level: Level,
  questionLogs: Array<{ pointsEarned: number; isFirstAttemptCorrect: boolean }>,
): SessionScoreDetails {
  const { baseScore, bonusScore, totalScore } = aggregateSessionScores(level, questionLogs);
  const streakBonus = calculateStreakBonus(
    questionLogs.map((log) => log.isFirstAttemptCorrect),
  );

  return {
    baseScore,
    timeBonus: bonusScore - streakBonus,
    streakBonus,
    totalScore,
  };
}

export function renderStars(stars: number): string {
  const clamped = Math.max(0, Math.min(STAR_COUNT, stars));
  const filled = "★".repeat(clamped);
  const empty = "☆".repeat(STAR_COUNT - clamped);
  return filled + empty;
}

export function buildGrowthMessage(
  currentFirstAttemptCorrect: number,
  previousFirstAttemptCorrect: number | null,
): string {
  if (previousFirstAttemptCorrect === null) {
    return "今日も がんばったね！";
  }

  if (currentFirstAttemptCorrect > previousFirstAttemptCorrect) {
    const diff = currentFirstAttemptCorrect - previousFirstAttemptCorrect;
    return `前回より +${diff} 問 改善！`;
  }

  return "今日も がんばったね！";
}
