import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { playerUnlockCelebrations } from "@/lib/db/schema";
import type { Level } from "@/lib/questions";
import type { Operation } from "@/lib/operations";
import { DEFAULT_OPERATION } from "@/lib/operations";

type DbExecutor = Pick<ReturnType<typeof getDb>, "insert">;

export async function getMemberCelebratedLevels(
  playerId: string,
  operation: Operation = DEFAULT_OPERATION,
): Promise<Level[]> {
  const rows = await getDb()
    .select({ level: playerUnlockCelebrations.level })
    .from(playerUnlockCelebrations)
    .where(
      and(
        eq(playerUnlockCelebrations.playerId, playerId),
        eq(playerUnlockCelebrations.operation, operation),
      ),
    );

  return rows.map((row) => row.level as Level).sort((a, b) => a - b);
}

export async function markMemberUnlockCelebrated(
  playerId: string,
  level: Level,
  operation: Operation = DEFAULT_OPERATION,
): Promise<void> {
  if (level <= 1) {
    return;
  }

  await getDb()
    .insert(playerUnlockCelebrations)
    .values({ playerId, level, operation })
    .onConflictDoNothing({
      target: [
        playerUnlockCelebrations.playerId,
        playerUnlockCelebrations.operation,
        playerUnlockCelebrations.level,
      ],
    });
}

export async function importMemberCelebratedLevels(
  playerId: string,
  levels: readonly number[],
  operation: Operation = DEFAULT_OPERATION,
  db: DbExecutor = getDb(),
): Promise<void> {
  const uniqueLevels = [...new Set(levels.filter((level) => level >= 2))];
  if (uniqueLevels.length === 0) {
    return;
  }

  await db
    .insert(playerUnlockCelebrations)
    .values(uniqueLevels.map((level) => ({ playerId, level, operation })))
    .onConflictDoNothing({
      target: [
        playerUnlockCelebrations.playerId,
        playerUnlockCelebrations.operation,
        playerUnlockCelebrations.level,
      ],
    });
}
