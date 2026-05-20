"use client";

import Link from "next/link";
import { getGuestCompletedSession } from "@/lib/guest-session";
import { useIsClient } from "@/lib/use-is-client";
import { renderStars } from "@/lib/scoring";
import { LEVEL_NAMES, type Level } from "@/lib/questions";

type GuestResultClientProps = {
  localId: string;
};

export function GuestResultClient({ localId }: GuestResultClientProps) {
  const isClient = useIsClient();
  const result = isClient ? getGuestCompletedSession(localId) : null;

  if (!isClient) {
    return <p className="text-center text-slate-600">読み込み中...</p>;
  }

  if (!result) {
    return (
      <div className="card text-center">
        <p className="mb-4">結果が 見つかりません</p>
        <Link href="/play" className="big-btn inline-block bg-sky-500 text-white">
          れんしゅうへ
        </Link>
      </div>
    );
  }

  return (
    <section className="card mx-auto max-w-xl text-center">
      <p className="text-lg text-slate-600">
        Lv{result.level} {LEVEL_NAMES[result.level as Level]}
      </p>
      <h1 className="mt-2 text-4xl font-bold text-slate-800">おつかれさま！</h1>

      <div className="my-8 grid gap-4">
        <p className="text-3xl font-bold">
          {result.questionLogs.length}問中 {result.correctAnswers}問正解！
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

      <p className="mt-10 text-center">
        <Link
          href="/signup?from=result"
          className="text-sm text-slate-500 underline hover:text-slate-700"
        >
          きろくを とうろくする（おうちのひとと）
        </Link>
      </p>
    </section>
  );
}
