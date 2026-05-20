"use client";

import Link from "next/link";
import { useEffect } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="page-shell">
      <section className="card mx-auto max-w-xl text-center">
        <h1 className="text-2xl font-bold text-slate-800">エラーが発生しました</h1>
        <p className="mt-4 text-slate-600">
          ページの読み込みに失敗しました。再読み込みするか、ゲストとして練習を続けてください。
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-slate-400">参照ID: {error.digest}</p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={reset} className="big-btn bg-sky-500 text-white">
            再試行
          </button>
          <Link href="/play" className="big-btn bg-violet-500 text-white">
            れんしゅうへ
          </Link>
        </div>
      </section>
    </main>
  );
}
