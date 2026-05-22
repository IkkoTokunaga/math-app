import type { Level } from "@/lib/questions";

/** 初回解放演出が未表示のレベル（2以上）を返す。複数あれば小さい方から。 */
export function getPendingUnlockCelebration(
  celebratedLevels: readonly Level[],
  unlockedLevel: Level,
): Level | null {
  if (unlockedLevel <= 1) {
    return null;
  }

  const celebrated = new Set<Level>([1 as Level, ...celebratedLevels]);
  for (let level = 2; level <= unlockedLevel; level += 1) {
    if (!celebrated.has(level as Level)) {
      return level as Level;
    }
  }

  return null;
}

export const UNLOCK_CELEBRATION_MS = 3200;
/** スクロール完了後に演出を開始するまでの待ち時間 */
export const UNLOCK_SCROLL_DELAY_MS = 400;
