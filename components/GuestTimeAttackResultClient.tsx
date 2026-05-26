"use client";

import Link from "next/link";
import { useIsClient } from "@/lib/use-is-client";
import { formatPoints } from "@/lib/format-number";
import { getGuestTimeAttackCompletedSession } from "@/lib/guest-time-attack";
import { getBossLabel } from "@/lib/time-attack";

type GuestTimeAttackResultClientProps = {
  localId: string;
};

export function GuestTimeAttackResultClient({ localId }: GuestTimeAttackResultClientProps) {
  const isClient = useIsClient();
  const result = isClient ? getGuestTimeAttackCompletedSession(localId) : null;

  if (!isClient) {
    return <p className="text-center text-muted">読み込み中...</p>;
  }

  if (!result) {
    return (
      <div className="card text-center">
        <p className="mb-4">結果が 見つかりません</p>
        <Link href="/play" className="big-btn big-btn-primary inline-block">
          モード選択へ
        </Link>
      </div>
    );
  }

  const isClear = result.timeAttackState.phase === "cleared";
  const failLabel = result.timeAttackState.failReason === "mistakes" ? "3回ミス" : null;
  const operationLabel = result.operation === "subtraction" ? "引き算" : "足し算";
  const bossLabel = getBossLabel(result.timeAttackState);
  const retryHref =
    result.operation === "subtraction"
      ? "/play/time-attack?operation=subtraction&new=1"
      : "/play/time-attack?new=1";
  const playHref =
    result.operation === "subtraction" ? "/play?operation=subtraction" : "/play";

  return (
    <section className="card mx-auto max-w-xl text-center">
      <p className="text-lg text-muted">タイムアタック（{operationLabel}）</p>
      <h1 className="chalk-heading mt-2 text-4xl font-bold">
        {isClear ? "クリア！" : "おつかれさま！"}
      </h1>

      <div className="my-8 grid gap-4">
        {isClear ? (
          <p className="text-success text-2xl font-bold">閻魔大王を倒した！</p>
        ) : (
          failLabel && <p className="text-lg text-muted">終了理由: {failLabel}</p>
        )}
        <p className="text-3xl font-bold">{formatPoints(result.totalScore)}点</p>
        <p className="text-xl">到達: {bossLabel}</p>
        <p className="text-lg">ボス撃破数: {result.timeAttackState.bossesDefeated}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={retryHref}
          data-button-sound="time-attack-start"
          className="big-btn big-btn-primary"
        >
          もう一度
        </Link>
        <Link href={playHref} className="big-btn big-btn-secondary">
          モード選択
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
