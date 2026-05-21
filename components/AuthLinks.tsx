import Link from "next/link";
import type { AuthState } from "@/lib/auth/state";

type AuthLinksProps = {
  auth: AuthState;
};

export function AuthLinks({ auth }: AuthLinksProps) {
  if (auth.loggedIn) {
    return null;
  }

  return (
    <div className="flex justify-center gap-4 text-muted">
      <Link href="/login" className="text-link">
        ログイン
      </Link>
      <Link href="/signup" className="text-link">
        サインアップ
      </Link>
    </div>
  );
}
