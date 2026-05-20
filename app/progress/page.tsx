import { ProgressClient } from "@/components/ProgressClient";
import { getAuthState } from "@/lib/auth";

export default async function ProgressPage() {
  const auth = await getAuthState();

  return (
    <main className="page-shell">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-slate-800">これまでの記録</h1>
      </header>
      <ProgressClient auth={auth} />
    </main>
  );
}
