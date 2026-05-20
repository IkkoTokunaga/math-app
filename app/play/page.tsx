import { PlayClient } from "@/components/PlayClient";
import { getAuthState } from "@/lib/auth";

export default async function PlayPage() {
  const auth = await getAuthState();

  return (
    <main className="page-shell">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-slate-800 sm:text-5xl">たしざん れんしゅう</h1>
        <p className="mt-2 text-lg text-slate-600">10問チャレンジ！</p>
      </header>
      <PlayClient auth={auth} />
    </main>
  );
}
