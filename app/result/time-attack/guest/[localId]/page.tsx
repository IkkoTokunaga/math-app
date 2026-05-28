import { GuestTimeAttackResultClient } from "@/components/GuestTimeAttackResultClient";
import { logAccess } from "@/lib/log";

type GuestTimeAttackResultPageProps = {
  params: Promise<{ localId: string }>;
};

export default async function GuestTimeAttackResultPage({
  params,
}: GuestTimeAttackResultPageProps) {
  const { localId } = await params;

  // アクセスログを記録
  await logAccess(`/result/time-attack/guest/${localId}`, undefined, localId);

  return (
    <main className="page-shell">
      <GuestTimeAttackResultClient localId={localId} />
    </main>
  );
}

