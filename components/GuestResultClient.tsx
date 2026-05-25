"use client";

import Link from "next/link";
import { SessionScoreBreakdown } from "@/components/SessionScoreBreakdown";
import { StarProgressBar } from "@/components/StarProgressBar";
import { getGuestCompletedSession } from "@/lib/guest-session";
import { useIsClient } from "@/lib/use-is-client";
import { type Level } from "@/lib/questions";

type GuestResultClientProps = {
  localId: string;
};

export function GuestResultClient({ localId }: GuestResultClientProps) {
  const isClient = useIsClient();
  const result = isClient ? getGuestCompletedSession(localId) : null;

  if (!isClient) {
    return <p className="text-center text-muted">読み込み中...</p>;
  }

  if (!result) {
    return (
      <div className="card text-center">
        <p className="mb-4">結果が 見つかりません</p>
        <Link href="/play" className="big-btn big-btn-primary inline-block">
          れんしゅうへ
        </Link>
      </div>
    );
  }

  return (
    <section className="card mx-auto max-w-xl text-center">
      <p className="text-lg text-muted">
        Lv{result.level}
        {result.operation === "subtraction" ? "（引き算）" : ""}
      </p>
      <h1 className="chalk-heading mt-2 text-4xl font-bold">おつかれさま！</h1>

      <div className="my-8 grid gap-4">
        <p className="text-3xl font-bold">
          {result.questionLogs.length}問中 {result.correctAnswers}問正解！
        </p>
        <p className="text-2xl">正答率 {result.accuracy}%</p>
        <StarProgressBar level={result.level as Level} totalScore={result.totalScore} />
        <p className="text-accent text-3xl font-bold">{result.totalScore}点</p>
        <SessionScoreBreakdown
          level={result.level as Level}
          questionLogs={result.questionLogs}
          operation={result.operation}
        />
        <p className="text-success text-lg">{result.growthMessage}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/play" className="big-btn big-btn-primary">
          もう一度
        </Link>
        <Link href="/progress" className="big-btn big-btn-secondary">
          記録を見る
        </Link>
      </div>

      <p className="mt-10 text-center">
        <Link
          href="/signup?from=result"
          className="text-dim text-sm underline hover:text-muted"
        >
          きろくを とうろくする（おうちのひとと）
        </Link>
      </p>
    </section>
  );
}
