"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useIsClient } from "@/lib/use-is-client";
import type { AuthState } from "@/lib/auth/state";
import { computeGuestProgress } from "@/lib/guest-progress";
import { readGuestStore } from "@/lib/guest-storage";
import { LEVEL_NAMES, QUESTIONS_PER_SESSION, type Level } from "@/lib/questions";
import { renderStars, STAR_COUNT } from "@/lib/scoring";

type ProgressData = {
  recentSessions: Array<{
    id: string;
    level: number;
    levelName: string;
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
  const [memberData, setMemberData] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isClient = useIsClient();

  useEffect(() => {
    if (!auth.loggedIn) {
      return;
    }

    fetch(`/api/progress?playerId=${auth.playerId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("failed");
        }
        return response.json();
      })
      .then(setMemberData)
      .catch(() => setError("記録の読み込みに失敗しました"));
  }, [auth]);

  const guestStore = isClient && !auth.loggedIn ? readGuestStore() : null;
  const guestData = guestStore
    ? computeGuestProgress(guestStore.completedSessions)
    : null;

  const displayData = auth.loggedIn ? memberData : guestData;
  const displayError = auth.loggedIn ? error : null;
  const guestNotice = !auth.loggedIn;

  if (!isClient) {
    return <p className="text-center text-lg text-muted">読み込み中...</p>;
  }

  if (displayError) {
    return (
      <div className="card text-center">
        <p className="mb-4">{displayError}</p>
        <Link href="/play" className="big-btn big-btn-primary inline-block">
          れんしゅうへ
        </Link>
      </div>
    );
  }

  if (!displayData) {
    return <p className="text-center text-lg text-muted">読み込み中...</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {guestNotice && (
        <p className="text-center text-sm text-dim">
          きろくは この 端末に だけ 保存されています
        </p>
      )}

      <section className="card grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-sm text-muted">今週の平均正答率</p>
          <p className="text-3xl font-bold">
            {displayData.weeklyAverage !== null ? `${displayData.weeklyAverage}%` : "今週はまだプレイしていません"}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted">連続学習日数</p>
          <p className="text-3xl font-bold">{displayData.learningStreak}日</p>
        </div>
        <div>
          <p className="text-sm text-muted">解放レベル</p>
          <p className="text-3xl font-bold">
            Lv{displayData.unlockedLevel} {LEVEL_NAMES[displayData.unlockedLevel as Level]}
          </p>
        </div>
      </section>

      {displayData.unlockProgress.nextLevel && (
        <section className="card">
          <p className="text-lg">
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

      <section className="card">
        <h2 className="mb-4 text-2xl font-bold">最近の結果</h2>
        <div className="flex flex-col gap-3">
          {displayData.recentSessions.map((session) => (
            <div
              key={session.id}
              className="row-item flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-bold">
                  Lv{session.level} {session.levelName}
                </p>
                <p className="text-sm text-dim">
                  {new Date(session.playedAt).toLocaleString("ja-JP")}
                </p>
              </div>
              <div className="text-right">
                <p>{renderStars(session.stars ?? 0)}</p>
                <p>
                  {session.correctAnswers}/{session.totalQuestions ?? QUESTIONS_PER_SESSION} 問　{session.totalScore}点
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
        <section className="card">
          <h2 className="mb-4 text-2xl font-bold">よく間違える問題</h2>
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
        <p className="text-center">
          <Link
            href="/signup"
            className="text-dim text-sm underline hover:text-muted"
          >
            きろくを とうろくする（おうちのひとと）
          </Link>
        </p>
      )}

      <Link href="/play" className="big-btn big-btn-primary text-center">
        れんしゅうへ
      </Link>
    </div>
  );
}
