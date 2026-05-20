export const dynamic = "force-dynamic";

import { PlayClient } from "@/components/PlayClient";
import { getAuthState } from "@/lib/auth";

export default async function PlayPage() {
  const auth = await getAuthState();

  return (
    <main className="page-shell">
      <PlayClient auth={auth} />
    </main>
  );
}
