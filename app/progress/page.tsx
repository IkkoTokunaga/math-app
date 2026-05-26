import { ProgressClient } from "@/components/ProgressClient";
import { getAuthState } from "@/lib/auth";

export default async function ProgressPage() {
  const auth = await getAuthState();

  return (
    <main className="page-shell">
      <ProgressClient auth={auth} />
    </main>
  );
}
