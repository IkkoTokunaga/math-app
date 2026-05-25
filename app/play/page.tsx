export const dynamic = "force-dynamic";

import { PlayClient } from "@/components/PlayClient";
import { getTimeAttackResumeInfoAction } from "@/app/actions/time-attack";
import { getAuthState } from "@/lib/auth";

export default async function PlayPage() {
  const auth = await getAuthState();
  const additionTimeAttackResume =
    auth.loggedIn ? await getTimeAttackResumeInfoAction(auth.playerId, "addition") : null;
  const subtractionTimeAttackResume =
    auth.loggedIn ? await getTimeAttackResumeInfoAction(auth.playerId, "subtraction") : null;

  return (
    <main className="page-shell">
      <PlayClient
        auth={auth}
        additionTimeAttackResume={additionTimeAttackResume}
        subtractionTimeAttackResume={subtractionTimeAttackResume}
      />
    </main>
  );
}
