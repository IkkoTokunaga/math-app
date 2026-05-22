"use server";

import { getAuthState } from "@/lib/auth/state";
import type { Level } from "@/lib/questions";
import {
  getMemberCelebratedLevels,
  markMemberUnlockCelebrated,
} from "@/lib/unlock-celebration-db";

async function assertOwnPlayer(playerId: string): Promise<void> {
  const auth = await getAuthState();
  if (!auth.loggedIn || auth.playerId !== playerId) {
    throw new Error("認証が必要です");
  }
}

export async function getMemberCelebratedLevelsAction(
  playerId: string,
): Promise<Level[]> {
  await assertOwnPlayer(playerId);
  return getMemberCelebratedLevels(playerId);
}

export async function markMemberUnlockCelebratedAction(
  playerId: string,
  level: Level,
): Promise<void> {
  await assertOwnPlayer(playerId);
  await markMemberUnlockCelebrated(playerId, level);
}
