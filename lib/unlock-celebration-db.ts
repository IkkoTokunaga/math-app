import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { playerUnlockCelebrations } from "@/lib/db/schema";
import type { Level } from "@/lib/questions";

type DbExecutor = Pick<ReturnType<typeof getDb>, "insert">;

export async function getMemberCelebratedLevels(playerId: string): Promise<Level[]> {
  const rows = await getDb()
    .select({ level: playerUnlockCelebrations.level })
    .from(playerUnlockCelebrations)
    .where(eq(playerUnlockCelebrations.playerId, playerId));

  return rows.map((row) => row.level as Level).sort((a, b) => a - b);
}

export async function markMemberUnlockCelebrated(
  playerId: string,
  level: Level,
): Promise<void> {
  if (level <= 1) {
    return;
  }

  await getDb()
    .insert(playerUnlockCelebrations)
    .values({ playerId, level })
    .onConflictDoNothing({
      target: [
        playerUnlockCelebrations.playerId,
        playerUnlockCelebrations.level,
      ],
    });
}

export async function importMemberCelebratedLevels(
  playerId: string,
  levels: readonly number[],
  db: DbExecutor = getDb(),
): Promise<void> {
  const uniqueLevels = [...new Set(levels.filter((level) => level >= 2))];
  if (uniqueLevels.length === 0) {
    return;
  }

  await db
    .insert(playerUnlockCelebrations)
    .values(uniqueLevels.map((level) => ({ playerId, level })))
    .onConflictDoNothing({
      target: [
        playerUnlockCelebrations.playerId,
        playerUnlockCelebrations.level,
      ],
    });
}
