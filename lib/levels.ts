import {
  calculateMaxPossibleSessionScore,
  STAR4_UNLOCK_COUNT,
  STAR_COUNT,
} from "./scoring";
import { QUESTIONS_PER_SESSION, type Level } from "./questions";

export const MAX_LEVEL = 4 as const;

export const UNLOCK_REQUIREMENTS: Partial<
  Record<Level, { fromLevel: Level; requiredStar4Sessions: number }>
> = {
  2: { fromLevel: 1, requiredStar4Sessions: STAR4_UNLOCK_COUNT },
  3: { fromLevel: 2, requiredStar4Sessions: STAR4_UNLOCK_COUNT },
  4: { fromLevel: 3, requiredStar4Sessions: STAR4_UNLOCK_COUNT },
};

export type CompletedSession = {
  level: number;
  stars: number;
  totalScore?: number | null;
};

/** 理論満点（または星5）で即次レベル解放 */
export function isPerfectSession(session: CompletedSession): boolean {
  if (session.totalScore != null) {
    const max = calculateMaxPossibleSessionScore(
      session.level as Level,
      QUESTIONS_PER_SESSION,
    );
    return session.totalScore >= max;
  }
  return session.stars >= STAR_COUNT;
}

export function countStar4Sessions(
  sessions: CompletedSession[],
  level: Level,
): number {
  return sessions.filter(
    (session) => session.level === level && session.stars === 4,
  ).length;
}

export function hasUnlockFromLevel(
  sessions: CompletedSession[],
  fromLevel: Level,
): boolean {
  const atLevel = sessions.filter((session) => session.level === fromLevel);
  if (atLevel.some(isPerfectSession)) {
    return true;
  }
  return countStar4Sessions(sessions, fromLevel) >= STAR4_UNLOCK_COUNT;
}

export function getUnlockedLevel(sessions: CompletedSession[]): Level {
  let unlocked: Level = 1;

  for (let level = 2 as Level; level <= MAX_LEVEL; level += 1) {
    const requirement = UNLOCK_REQUIREMENTS[level];
    if (!requirement) {
      continue;
    }
    if (hasUnlockFromLevel(sessions, requirement.fromLevel)) {
      unlocked = level;
    } else {
      break;
    }
  }

  return unlocked;
}

export function getUnlockProgress(
  sessions: CompletedSession[],
  unlockedLevel: Level,
): {
  nextLevel: Level | null;
  currentStar4: number;
  requiredStar4: number;
  hasPerfect: boolean;
} {
  const nextLevel = unlockedLevel < MAX_LEVEL ? ((unlockedLevel + 1) as Level) : null;
  if (!nextLevel) {
    return { nextLevel: null, currentStar4: 0, requiredStar4: 0, hasPerfect: false };
  }

  const requirement = UNLOCK_REQUIREMENTS[nextLevel];
  if (!requirement) {
    return { nextLevel: null, currentStar4: 0, requiredStar4: 0, hasPerfect: false };
  }

  const fromLevel = requirement.fromLevel;
  const atLevel = sessions.filter((session) => session.level === fromLevel);

  return {
    nextLevel,
    currentStar4: countStar4Sessions(sessions, fromLevel),
    requiredStar4: requirement.requiredStar4Sessions,
    hasPerfect: atLevel.some(isPerfectSession),
  };
}
