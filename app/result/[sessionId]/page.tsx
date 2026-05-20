import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionResultAction } from "@/app/actions/session";
import { getAuthState } from "@/lib/auth";
import { renderStars } from "@/lib/scoring";
import { LEVEL_NAMES, type Level } from "@/lib/questions";

type ResultPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function ResultPage({ params }: ResultPageProps) {
  const { sessionId } = await params;
  const auth = await getAuthState();
  const result = await getSessionResultAction(sessionId);

  if (!result) {
    notFound();
  }

  return (
    <main className="page-shell">
      <section className="card mx-auto max-w-xl text-center">
        <p className="text-lg text-slate-600">
          Lv{result.level} {LEVEL_NAMES[result.level as Level]}
        </p>
        <h1 className="mt-2 text-4xl font-bold text-slate-800">おつかれさま！</h1>

        <div className="my-8 grid gap-4">
          <p className="text-3xl font-bold">
            {result.totalQuestions}問中 {result.correctAnswers}問正解！
          </p>
          <p className="text-2xl">正答率 {result.accuracy}%</p>
          <p className="text-5xl">{renderStars(result.stars)}</p>
          <p className="text-3xl font-bold text-sky-600">{result.totalScore}点</p>
          <p className="text-lg text-emerald-600">{result.growthMessage}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/play" className="big-btn bg-sky-500 text-white">
            もう一度
          </Link>
          <Link href="/progress" className="big-btn bg-violet-500 text-white">
            記録を見る
          </Link>
        </div>

        {!auth.loggedIn && (
          <p className="mt-10 text-center">
            <Link
              href="/signup?from=result"
              className="text-sm text-slate-500 underline hover:text-slate-700"
            >
              きろくを とうろくする（おうちのひとと）
            </Link>
          </p>
        )}
      </section>
    </main>
  );
}
