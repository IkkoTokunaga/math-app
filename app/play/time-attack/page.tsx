export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import {
  resumeTimeAttackSessionAction,
  startTimeAttackSessionAction,
} from "@/app/actions/time-attack";
import { TimeAttackClient } from "@/components/TimeAttackClient";
import { getAuthState } from "@/lib/auth";

type TimeAttackPlayPageProps = {
  searchParams: Promise<{ new?: string }>;
};

export default async function TimeAttackPlayPage({ searchParams }: TimeAttackPlayPageProps) {
  const auth = await getAuthState();

  if (!auth.loggedIn) {
    redirect("/play");
  }

  const { new: newParam } = await searchParams;
  const forceNew = newParam === "1";

  let initialSession;
  if (forceNew) {
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
