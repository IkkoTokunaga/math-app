"use server";

import { getAuthState } from "@/lib/auth/state";
import type { Level } from "@/lib/questions";
import type { Operation } from "@/lib/operations";
import { DEFAULT_OPERATION } from "@/lib/operations";
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
  operation: Operation = DEFAULT_OPERATION,
): Promise<Level[]> {
  await assertOwnPlayer(playerId);
  return getMemberCelebratedLevels(playerId, operation);
}

export async function markMemberUnlockCelebratedAction(
  playerId: string,
  level: Level,
  operation: Operation = DEFAULT_OPERATION,
): Promise<void> {
  await assertOwnPlayer(playerId);
  await markMemberUnlockCelebrated(playerId, level, operation);
}
