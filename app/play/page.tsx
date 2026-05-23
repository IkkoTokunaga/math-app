export const dynamic = "force-dynamic";

import { PlayClient } from "@/components/PlayClient";
import { getTimeAttackResumeInfoAction } from "@/app/actions/time-attack";
import { getAuthState } from "@/lib/auth";

export default async function PlayPage() {
  const auth = await getAuthState();
  const timeAttackResume =
    auth.loggedIn ? await getTimeAttackResumeInfoAction(auth.playerId) : null;

  return (
    <main className="page-shell">
      <PlayClient auth={auth} timeAttackResume={timeAttackResume} />
    </main>
  );
}
