export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import {
  resumeTimeAttackSessionAction,
  startTimeAttackSessionAction,
} from "@/app/actions/time-attack";
import { TimeAttackClient } from "@/components/TimeAttackClient";
import { getAuthState } from "@/lib/auth";
import { parseDevTimeAttackStart } from "@/lib/dev-time-attack-setup";

type TimeAttackPlayPageProps = {
  searchParams: Promise<{ new?: string; devStart?: string; devEnma?: string }>;
};

export default async function TimeAttackPlayPage({ searchParams }: TimeAttackPlayPageProps) {
  const auth = await getAuthState();

  if (!auth.loggedIn) {
    redirect("/play");
  }

  const params = await searchParams;
  const forceNew = params.new === "1";
  const devStart = parseDevTimeAttackStart(params);

  let initialSession;
  if (devStart) {
    initialSession = await startTimeAttackSessionAction(auth.playerId, true, devStart);
  } else if (forceNew) {
    initialSession = await startTimeAttackSessionAction(auth.playerId, true);
  } else {
    initialSession = (await resumeTimeAttackSessionAction(auth.playerId)) ??
      (await startTimeAttackSessionAction(auth.playerId));
  }

  if ("needsConfirm" in initialSession) {
    redirect("/play");
  }

  return (
    <main className="page-shell page-shell--quiz">
      <TimeAttackClient auth={auth} initialSession={initialSession} />
    </main>
  );
}
