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
    <div className="flex justify-center gap-4 text-slate-600">
      <Link href="/login" className="underline hover:text-sky-600">
        ログイン
      </Link>
      <Link href="/signup" className="underline hover:text-sky-600">
        サインアップ
      </Link>
    </div>
  );
}
