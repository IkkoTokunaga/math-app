import { GuestResultClient } from "@/components/GuestResultClient";
import { getAuthState } from "@/lib/auth";
import { redirect } from "next/navigation";

type GuestResultPageProps = {
  params: Promise<{ localId: string }>;
};

export default async function GuestResultPage({ params }: GuestResultPageProps) {
  const auth = await getAuthState();
  if (auth.loggedIn) {
    redirect("/progress");
  }

  const { localId } = await params;

  return (
    <main className="page-shell">
      <GuestResultClient localId={localId} />
    </main>
  );
}
