import { createHash, randomBytes } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { authSessions } from "@/lib/db/schema";
import { AUTH_COOKIE_NAME, AUTH_SESSION_MAX_AGE_SEC } from "./constants";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function setAuthCookie(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + AUTH_SESSION_MAX_AGE_SEC * 1000);

  await db.insert(authSessions).values({
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

  if (token) {
    const tokenHash = hashToken(token);
    await db.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash));
  }

  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getUserIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);
  const now = new Date();

  const [row] = await db
    .select({ userId: authSessions.userId })
    .from(authSessions)
    .where(and(eq(authSessions.tokenHash, tokenHash), gt(authSessions.expiresAt, now)))
    .limit(1);

  return row?.userId ?? null;
}
