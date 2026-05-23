import Link from "next/link";
import { notFound } from "next/navigation";
import { getTimeAttackResultAction } from "@/app/actions/time-attack";

type TimeAttackResultPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function TimeAttackResultPage({ params }: TimeAttackResultPageProps) {
  const { sessionId } = await params;
  const result = await getTimeAttackResultAction(sessionId);

  if (!result) {
    notFound();
  }

  const isClear = result.cleared;
  const failLabel = result.failReason === "mistakes" ? "3回ミス" : null;

  return (
    <main className="page-shell">
      <section className="card mx-auto max-w-xl text-center">
        <p className="text-lg text-muted">タイムアタック</p>
        <h1 className="chalk-heading mt-2 text-4xl font-bold">
          {isClear ? "クリア！" : "おつかれさま！"}
        </h1>

        <div className="my-8 grid gap-4">
          {isClear ? (
            <p className="text-success text-2xl font-bold">閻魔大王を倒した！</p>
          ) : (
            failLabel && <p className="text-lg text-muted">終了理由: {failLabel}</p>
          )}
          <p className="text-3xl font-bold">{result.totalScore}点</p>
          <p className="text-xl">到達: {result.bossLabel}</p>
          <p className="text-lg">ボス撃破数: {result.bossesDefeated}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/play/time-attack?new=1" className="big-btn big-btn-primary">
            もう一度
          </Link>
          <Link href="/play" className="big-btn big-btn-secondary">
            モード選択
          </Link>
        </div>
      </section>
    </main>
  );
}
