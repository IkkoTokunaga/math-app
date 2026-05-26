"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OperationTabsPanel } from "@/components/OperationTabsPanel";
import { SoundToggleButton } from "@/components/SoundToggleButton";
import { useIsClient } from "@/lib/use-is-client";
import { useHomeBgm } from "@/lib/use-home-bgm";
import type { AuthState } from "@/lib/auth/state";
import { computeGuestProgress } from "@/lib/guest-progress";
import { readGuestStore } from "@/lib/guest-storage";
import { QUESTIONS_PER_SESSION } from "@/lib/questions";
import type { Operation } from "@/lib/operations";
import { DEFAULT_OPERATION, getMascotSrc, parseOperation } from "@/lib/operations";
import { renderStars, STAR_COUNT } from "@/lib/scoring";

type ProgressData = {
  operation: Operation;
  recentSessions: Array<{
    id: string;
    level: number;
    correctAnswers: number | null;
    accuracy: number | null;
    totalQuestions?: number | null;
    stars: number | null;
    totalScore: number | null;
    playedAt: string | Date;
  }>;
  weeklyAverage: number | null;
  learningStreak: number;
  unlockedLevel: number;
  unlockProgress: {
    nextLevel: number | null;
    currentStar4: number;
    requiredStar4: number;
    hasPerfect: boolean;
  };
  weakSpots: Array<{ label: string; missCount: number }>;
};

type ProgressClientProps = {
  auth: AuthState;
};

export function ProgressClient({ auth }: ProgressClientProps) {
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null);
  const [progressByOperation, setProgressByOperation] = useState<
    Partial<Record<Operation, ProgressData>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const isClient = useIsClient();

  useHomeBgm(isClient);

  const operation: Operation =
    selectedOperation ??
    (isClient
      ? parseOperation(new URLSearchParams(window.location.search).get("operation"))
      : DEFAULT_OPERATION);

  const selectOperation = (next: Operation) => {
    setSelectedOperation(next);
    const url = new URL(window.location.href);
    if (next === "subtraction") {
      url.searchParams.set("operation", "subtraction");
    } else {
      url.searchParams.delete("operation");
    }
    window.history.replaceState({}, "", url.pathname + url.search);
  };

  useEffect(() => {
    if (!auth.loggedIn) {
      return;
    }

    let cancelled = false;
    fetch(`/api/progress?playerId=${auth.playerId}&operation=${operation}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("failed");
        }
        return response.json();
      })
      .then((data: ProgressData) => {
        if (!cancelled) {
          setProgressByOperation((prev) => ({ ...prev, [operation]: data }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("記録の読み込みに失敗しました");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [auth, operation]);

  const guestStore = isClient && !auth.loggedIn ? readGuestStore() : null;
  const guestData = guestStore
    ? computeGuestProgress(guestStore.completedSessions, operation)
    : null;

  const displayData = auth.loggedIn ? (progressByOperation[operation] ?? null) : guestData;
  const isPanelLoading = auth.loggedIn && displayData === null;
  const displayError = auth.loggedIn ? error : null;
  const guestNotice = !auth.loggedIn;
  const playHref = operation === "subtraction" ? "/play?operation=subtraction" : "/play";

  if (!isClient) {
    return <p className="text-center text-lg text-muted">読み込み中...</p>;
  }

  if (displayError) {
    return (
      <>
        <SoundToggleButton />
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
          <div className="play-board p-6 text-center">
            <p className="mb-4">{displayError}</p>
            <Link href={playHref} className="play-record-board__link">
              れんしゅうへ
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SoundToggleButton />
      <header className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <div className="progress-header-mascot" aria-hidden>
            <img
              src={getMascotSrc(operation)}
              alt=""
              width={155}
              height={312}
              className="progress-header-mascot__img"
            />
          </div>
          <h1 className="chalk-heading text-4xl font-bold sm:text-5xl">これまでの記録</h1>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <div className="play-record-board">
          <div className="play-record-board__body">
            <Link href={playHref} className="play-record-board__link">
              れんしゅうへ
            </Link>
          </div>
        </div>

        <OperationTabsPanel
          operation={operation}
          onSelectOperation={selectOperation}
          tabPanelId="progress-operation-tabpanel"
        >
          {isPanelLoading ? (
            <div className="progress-operation-panel-placeholder" aria-busy="true">
              <p className="text-muted">読み込み中...</p>
            </div>
          ) : (
            displayData && (
              <>
          {guestNotice && (
            <p className="text-center text-sm text-dim">
              きろくは この 端末に だけ 保存されています
            </p>
          )}

          <section className="progress-panel-section grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted">今週の平均正答率</p>
              <p className="text-2xl font-bold">
                {displayData.weeklyAverage !== null ? `${displayData.weeklyAverage}%` : "—"}
              </p>
              {displayData.weeklyAverage === null && (
                <p className="text-sm text-muted">今週はまだプレイしていません</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted">連続学習日数</p>
              <p className="text-2xl font-bold">{displayData.learningStreak}日</p>
            </div>
            <div>
              <p className="text-sm text-muted">解放レベル</p>
              <p className="text-2xl font-bold">Lv{displayData.unlockedLevel}</p>
            </div>
          </section>

          {displayData.unlockProgress.nextLevel && (
            <section className="progress-panel-section">
              <p className="text-lg font-bold">
                次のレベル（Lv{displayData.unlockProgress.nextLevel}）へ
              </p>
              <ul className="mt-2 list-inside list-disc text-muted">
                <li>{renderStars(STAR_COUNT)} 満点で すぐ解放</li>
                <li>
                  または {renderStars(4).replace(/☆/g, "")} を あと{" "}
                  {Math.max(
                    displayData.unlockProgress.requiredStar4 -
                      displayData.unlockProgress.currentStar4,
                    0,
                  )}{" "}
                  回（{displayData.unlockProgress.currentStar4}/
                  {displayData.unlockProgress.requiredStar4}）
                </li>
              </ul>
              {displayData.unlockProgress.hasPerfect && (
                <p className="mt-2 text-success">満点を とれたよ！ 次のレベルが ひらける</p>
              )}
            </section>
          )}

          <section className="progress-panel-section">
            <h2 className="chalk-heading mb-4 text-2xl font-bold">最近の結果</h2>
            <div className="flex flex-col gap-3">
              {displayData.recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="row-item flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-bold">Lv{session.level}</p>
                    <p className="text-sm text-dim">
                      {new Date(session.playedAt).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>{renderStars(session.stars ?? 0)}</p>
                    <p>
                      {session.correctAnswers}/{session.totalQuestions ?? QUESTIONS_PER_SESSION} 問　
                      {session.totalScore}点
                    </p>
                  </div>
                </div>
              ))}
              {displayData.recentSessions.length === 0 && (
                <p className="text-muted">まだ記録がありません</p>
              )}
            </div>
          </section>

          {displayData.weakSpots.length > 0 && (
            <section className="progress-panel-section">
              <h2 className="chalk-heading mb-4 text-2xl font-bold">よく間違える問題</h2>
              <ul className="flex flex-col gap-2">
                {displayData.weakSpots.map((spot) => (
                  <li key={spot.label} className="row-item-warn text-lg">
                    {spot.label}（{spot.missCount}回）
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!auth.loggedIn && (
            <p className="progress-panel-section text-center">
              <Link
                href="/signup"
                className="play-record-board__link"
              >
                きろくを とうろくする（おうちのひとと）
              </Link>
            </p>
          )}
              </>
            )
          )}
        </OperationTabsPanel>
      </div>
    </>
  );
}
