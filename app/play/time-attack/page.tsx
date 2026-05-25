export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import {
  resumeTimeAttackSessionAction,
  startTimeAttackSessionAction,
} from "@/app/actions/time-attack";
import { TimeAttackClient } from "@/components/TimeAttackClient";
import { getAuthState } from "@/lib/auth";
import { parseDevTimeAttackStart } from "@/lib/dev-time-attack-setup";
import { parseOperation } from "@/lib/operations";

type TimeAttackPlayPageProps = {
  searchParams: Promise<{
    new?: string;
    devStart?: string;
    devEnma?: string;
    operation?: string;
  }>;
};

export default async function TimeAttackPlayPage({ searchParams }: TimeAttackPlayPageProps) {
  const auth = await getAuthState();

  if (!auth.loggedIn) {
    redirect("/play");
  }

  const params = await searchParams;
  const operation = parseOperation(params.operation);
  const forceNew = params.new === "1";
  const devStart = parseDevTimeAttackStart(params);

  let initialSession;
  if (devStart) {
    initialSession = await startTimeAttackSessionAction(
      auth.playerId,
      true,
      devStart,
      operation,
    );
  } else if (forceNew) {
    initialSession = await startTimeAttackSessionAction(auth.playerId, true, null, operation);
  } else {
    initialSession = await resumeTimeAttackSessionAction(auth.playerId, operation);
    if (!initialSession) {
      redirect(operation === "subtraction" ? "/play?operation=subtraction" : "/play");
    }
  }

  if ("needsConfirm" in initialSession) {
    redirect(operation === "subtraction" ? "/play?operation=subtraction" : "/play");
  }

  return (
    <main className="page-shell page-shell--quiz">
      <TimeAttackClient auth={auth} initialSession={initialSession} operation={operation} />
    </main>
  );
}
