import { redirect } from "next/navigation";
import { LoginClient } from "@/components/LoginClient";
import { getAuthState } from "@/lib/auth";

export default async function LoginPage() {
  const auth = await getAuthState();
  if (auth.loggedIn) {
    redirect("/play");
  }

  return (
    <main className="page-shell">
      <LoginClient />
    </main>
  );
}
