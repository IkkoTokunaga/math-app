"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAuthCookie, setAuthCookie, verifyPassword } from "@/lib/auth";
import { getAuthState } from "@/lib/auth/state";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { GuestStoreSnapshot } from "@/lib/guest/types";
import { importGuestData, type CelebratedLevelsByOperation } from "@/lib/import-guest";

export async function getAuthStateAction() {
  return getAuthState();
}

export async function loginAction(email: string, password: string) {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !password) {
    throw new Error("メールとパスワードを入力してください");
  }

  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, trimmedEmail))
    .limit(1);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new Error("メールまたはパスワードが正しくありません");
  }

  await setAuthCookie(user.id);
  revalidatePath("/play");
  return getAuthState();
}

export async function registerAndImportGuestAction(
  email: string,
  password: string,
  childName: string,
  snapshot: GuestStoreSnapshot,
  celebratedLevels: CelebratedLevelsByOperation = {},
) {
  const trimmedEmail = email.trim().toLowerCase();
  const [existing] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, trimmedEmail))
    .limit(1);

  if (existing) {
    throw new Error("このメールはすでに登録されています。ログインしてください。");
  }

  const { userId } = await importGuestData(
    email,
    password,
    childName,
    snapshot,
    celebratedLevels,
  );
  await setAuthCookie(userId);
  revalidatePath("/play");
  return { ok: true as const };
}

export async function logoutAction() {
  await clearAuthCookie();
  revalidatePath("/");
}

export async function logoutAndRedirectAction() {
  await clearAuthCookie();
  redirect("/play");
}
