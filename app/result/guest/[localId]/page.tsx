import { GuestResultClient } from "@/components/GuestResultClient";
import { getAuthState } from "@/lib/auth";
import { redirect } from "next/navigation";
import { logAccess } from "@/lib/log";

type GuestResultPageProps = {
  params: Promise<{ localId: string }>;
};

export default async function GuestResultPage({ params }: GuestResultPageProps) {
  const auth = await getAuthState();
  if (auth.loggedIn) {
    redirect("/progress");
  }

  const { localId } = await params;

  // アクセスログを記録
  await logAccess(`/result/guest/${localId}`, undefined, localId);

  return (
    <main className="page-shell">
      <GuestResultClient localId={localId} />
    </main>
  );
}

