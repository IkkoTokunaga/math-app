export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { startTimeAttackSessionAction } from "@/app/actions/time-attack";
import { TimeAttackClient } from "@/components/TimeAttackClient";
import { getAuthState } from "@/lib/auth";

export default async function TimeAttackPlayPage() {
  const auth = await getAuthState();

  if (!auth.loggedIn) {
    redirect("/play");
  }

  const initialSession = await startTimeAttackSessionAction(auth.playerId);

  return (
    <main className="page-shell page-shell--quiz">
      <TimeAttackClient auth={auth} initialSession={initialSession} />
    </main>
  );
}
