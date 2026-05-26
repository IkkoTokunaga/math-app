import { GuestTimeAttackResultClient } from "@/components/GuestTimeAttackResultClient";

type GuestTimeAttackResultPageProps = {
  params: Promise<{ localId: string }>;
};

export default async function GuestTimeAttackResultPage({
  params,
}: GuestTimeAttackResultPageProps) {
  const { localId } = await params;

  return (
    <main className="page-shell">
      <GuestTimeAttackResultClient localId={localId} />
    </main>
  );
}
