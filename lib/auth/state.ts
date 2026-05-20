import { eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { players } from "@/lib/db/schema";
import { getUserIdFromCookie } from "./session";

export type AuthState =
  | { loggedIn: false }
  | {
      loggedIn: true;
      userId: string;
      playerId: string;
      playerName: string;
    };

export async function getAuthState(): Promise<AuthState> {
  if (!isDatabaseConfigured()) {
    return { loggedIn: false };
  }

  try {
    const userId = await getUserIdFromCookie();
    if (!userId) {
      return { loggedIn: false };
    }

    const [player] = await getDb()
      .select({
        id: players.id,
        name: players.name,
      })
      .from(players)
      .where(eq(players.userId, userId))
      .limit(1);

    if (!player) {
      return { loggedIn: false };
    }

    return {
      loggedIn: true,
      userId,
      playerId: player.id,
      playerName: player.name,
    };
  } catch (error) {
    console.error("Failed to load auth state from database", error);
    return { loggedIn: false };
  }
}
