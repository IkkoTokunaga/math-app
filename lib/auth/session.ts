import { createHash, randomBytes } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { authSessions } from "@/lib/db/schema";
import { AUTH_COOKIE_NAME, AUTH_SESSION_MAX_AGE_SEC } from "./constants";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function setAuthCookie(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + AUTH_SESSION_MAX_AGE_SEC * 1000);

  await getDb().insert(authSessions).values({
    userId,
    tokenHash,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_SESSION_MAX_AGE_SEC,
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (token && isDatabaseConfigured()) {
    try {
      const tokenHash = hashToken(token);
      await getDb().delete(authSessions).where(eq(authSessions.tokenHash, tokenHash));
    } catch (error) {
      console.error("Failed to delete auth session from database", error);
    }
  }

  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getUserIdFromCookie(): Promise<string | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return null;
    }

    const tokenHash = hashToken(token);
    const now = new Date();

    const [row] = await getDb()
      .select({ userId: authSessions.userId })
      .from(authSessions)
      .where(and(eq(authSessions.tokenHash, tokenHash), gt(authSessions.expiresAt, now)))
      .limit(1);

    return row?.userId ?? null;
  } catch (error) {
    console.error("Failed to read auth session from database", error);
    return null;
  }
}
