import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SignupClient } from "@/components/SignupClient";
import { getAuthState } from "@/lib/auth";

export default async function SignupPage() {
  const auth = await getAuthState();
  if (auth.loggedIn) {
    redirect("/play");
  }

  return (
    <main className="page-shell">
      <Suspense fallback={<p className="text-center text-slate-600">読み込み中...</p>}>
        <SignupClient />
      </Suspense>
    </main>
  );
}
