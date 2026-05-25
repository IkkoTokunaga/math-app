import {
  calculateMaxPossibleSessionScore,
  STAR4_UNLOCK_COUNT,
  STAR_COUNT,
} from "./scoring";
import { QUESTIONS_PER_SESSION, type Level } from "./questions";
import type { Operation } from "./operations";
import { DEFAULT_OPERATION } from "./operations";

export const MAX_LEVEL = 10 as const;

export const UNLOCK_REQUIREMENTS: Partial<
  Record<Level, { fromLevel: Level; requiredStar4Sessions: number }>
> = Object.fromEntries(
  Array.from({ length: MAX_LEVEL - 1 }, (_, index) => {
    const nextLevel = (index + 2) as Level;
    return [
      nextLevel,
      { fromLevel: (index + 1) as Level, requiredStar4Sessions: STAR4_UNLOCK_COUNT },
    ];
  }),
) as Partial<Record<Level, { fromLevel: Level; requiredStar4Sessions: number }>>;

export type CompletedSession = {
  level: number;
  stars: number;
  totalScore?: number | null;
  operation?: Operation;
};

export function filterSessionsByOperation(
  sessions: CompletedSession[],
  operation: Operation = DEFAULT_OPERATION,
): CompletedSession[] {
  return sessions.filter(
    (session) => (session.operation ?? DEFAULT_OPERATION) === operation,
  );
}

/** 理論満点（または星5）で即次レベル解放 */
export function isPerfectSession(session: CompletedSession): boolean {
  if (session.stars >= STAR_COUNT) {
    return true;
  }
  if (session.totalScore != null) {
    const max = calculateMaxPossibleSessionScore(
      session.level as Level,
      QUESTIONS_PER_SESSION,
    );
    return session.totalScore >= max;
  }
  return false;
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

export function getUnlockedLevel(
  sessions: CompletedSession[],
  operation: Operation = DEFAULT_OPERATION,
): Level {
  const scoped = filterSessionsByOperation(sessions, operation);
  let unlocked: Level = 1;

  for (let level = 2; level <= MAX_LEVEL; level += 1) {
    const requirement = UNLOCK_REQUIREMENTS[level as Level];
    if (!requirement) {
      continue;
    }
    if (hasUnlockFromLevel(scoped, requirement.fromLevel)) {
      unlocked = level as Level;
    } else {
      break;
    }
  }

  return unlocked;
}

export function getUnlockProgress(
  sessions: CompletedSession[],
  unlockedLevel: Level,
  operation: Operation = DEFAULT_OPERATION,
): {
  nextLevel: Level | null;
  currentStar4: number;
  requiredStar4: number;
  hasPerfect: boolean;
} {
  const scoped = filterSessionsByOperation(sessions, operation);
  const nextLevel = unlockedLevel < MAX_LEVEL ? ((unlockedLevel + 1) as Level) : null;
  if (!nextLevel) {
    return { nextLevel: null, currentStar4: 0, requiredStar4: 0, hasPerfect: false };
  }

  const requirement = UNLOCK_REQUIREMENTS[nextLevel];
  if (!requirement) {
    return { nextLevel: null, currentStar4: 0, requiredStar4: 0, hasPerfect: false };
  }

  const fromLevel = requirement.fromLevel;
  const atLevel = scoped.filter((session) => session.level === fromLevel);

  return {
    nextLevel,
    currentStar4: countStar4Sessions(scoped, fromLevel),
    requiredStar4: requirement.requiredStar4Sessions,
    hasPerfect: atLevel.some(isPerfectSession),
  };
}
