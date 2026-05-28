import { getDb } from "@/lib/db";
import { accessLogs } from "@/lib/db/schema";
import { headers } from "next/headers";

export async function logAccess(
  path: string,
  sessionId?: string,
  guestSessionId?: string,
) {
  try {
    const headersList = await headers();
    
    // User-AgentとIPアドレスをヘッダーから取得
    const userAgent = (headersList.get("user-agent") || "").substring(0, 1024);
    const rawIp =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      "127.0.0.1";
    const ipAddress = rawIp.substring(0, 45);

    await getDb().insert(accessLogs).values({
      ipAddress,
      userAgent,
      path,
      sessionId,
      guestSessionId,
    });
  } catch (error) {
    // ログ記録の失敗がユーザーのアプリ利用を妨げないようにエラーはキャッチしてコンソール出力に留める
    console.error("Failed to log access:", error);
  }
}
