"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import {
  getPlayerUnlockedLevelAction,
  startSessionAction,
  submitAnswerAction,
} from "@/app/actions/session";
import { AuthLinks } from "@/components/AuthLinks";
import { Keypad } from "@/components/Keypad";
import type { AuthState } from "@/lib/auth/state";
import { getGuestLabel } from "@/lib/guest-storage";
import {
  getGuestUnlockedLevel,
  startGuestSession,
  submitGuestAnswer,
} from "@/lib/guest-session";
import { useIsClient } from "@/lib/use-is-client";
import { LEVEL_NAMES, type Level } from "@/lib/questions";

type Question = {
  operandA: number;
  operandB: number;
};

type PlayClientProps = {
  auth: AuthState;
};

export function PlayClient({ auth }: PlayClientProps) {
  const router = useRouter();
  const isMember = auth.loggedIn;
  const isClient = useIsClient();
  const [level, setLevel] = useState<Level | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [localId, setLocalId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "retry" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockedLevel, setUnlockedLevel] = useState<Level>(1);
  const questionStartedAtRef = useRef<number>(0);

  useEffect(() => {
    if (sessionId || localId) {
      questionStartedAtRef.current = Date.now();
    }
  }, [currentIndex, sessionId, localId]);

  useEffect(() => {
    if (auth.loggedIn) {
      getPlayerUnlockedLevelAction(auth.playerId)
        .then(setUnlockedLevel)
        .catch(() => setUnlockedLevel(1));
    }
  }, [auth]);

  const guestUnlocked = isClient ? getGuestUnlockedLevel() : 1;
  const effectiveUnlocked = auth.loggedIn ? unlockedLevel : guestUnlocked;
  const displayName = isMember ? auth.playerName : getGuestLabel();

  const startSession = async (selectedLevel: Level) => {
    setError(null);
    setSubmitting(true);
    try {
      if (isMember) {
        const result = await startSessionAction(auth.playerId, selectedLevel);
        setLevel(selectedLevel);
        setSessionId(result.sessionId);
        setLocalId(null);
        setQuestions(result.questions);
      } else {
        const result = startGuestSession(selectedLevel);
        setLevel(selectedLevel);
        setLocalId(result.localId);
        setSessionId(null);
        setQuestions(result.questions);
      }
      setCurrentIndex(0);
      setAnswer("");
      setFeedback(null);
      setFeedbackType(null);
      questionStartedAtRef.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : "セッション開始に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const submitAnswer = async () => {
    const activeId = isMember ? sessionId : localId;
    if (!activeId || answer.length === 0 || submitting) {
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    setFeedbackType(null);

    const elapsedSeconds = (Date.now() - questionStartedAtRef.current) / 1000;

    try {
      if (isMember) {
        const result = await submitAnswerAction(
          activeId,
          currentIndex,
          Number(answer),
          elapsedSeconds,
        );

        if (!result.correct) {
          setFeedback(result.message);
          setFeedbackType("retry");
          setAnswer("");
          return;
        }

        setFeedback(result.message);
        setFeedbackType("success");

        if (result.completed) {
          setTimeout(() => {
            router.push(`/result/${activeId}`);
          }, 700);
          return;
        }
      } else {
        const result = submitGuestAnswer(
          activeId,
          currentIndex,
          Number(answer),
          elapsedSeconds,
        );

        if (!result.correct) {
          setFeedback(result.message);
          setFeedbackType("retry");
          setAnswer("");
          return;
        }

        setFeedback(result.message);
        setFeedbackType("success");

        if (result.completed) {
          setTimeout(() => {
            router.push(`/result/guest/${activeId}`);
          }, 700);
          return;
        }
      }

      setTimeout(() => {
        setCurrentIndex((index) => index + 1);
        setAnswer("");
        setFeedback(null);
        setFeedbackType(null);
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "回答の送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const backToLevels = () => {
    setSessionId(null);
    setLocalId(null);
    setLevel(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswer("");
    setFeedback(null);
    setFeedbackType(null);
    setError(null);
  };

  if (!isClient) {
    return <p className="text-center text-lg text-slate-600">読み込み中...</p>;
  }

  if (!sessionId && !localId) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <p className="text-center text-xl font-bold text-slate-700">{displayName}</p>
        <h2 className="text-center text-3xl font-bold text-slate-800">レベルを選ぶ</h2>
        {(Object.entries(LEVEL_NAMES) as [string, string][]).map(([value, label]) => {
          const lv = Number(value) as Level;
          const disabled = lv > effectiveUnlocked;
          return (
            <button
              key={value}
              type="button"
              disabled={submitting || disabled}
              onClick={() => startSession(lv)}
              className="big-btn disabled:opacity-40"
            >
              Lv{value} {label}
              {disabled && "（まだ）"}
            </button>
          );
        })}
        {error && <p className="feedback-error">{error}</p>}
        <Link href="/progress" className="big-btn bg-violet-500 text-center text-white">
          これまでの記録
        </Link>
        <AuthLinks auth={auth} />
        {auth.loggedIn && (
          <p className="text-center">
            <button
              type="button"
              onClick={async () => {
                await logoutAction();
                window.location.href = "/play";
              }}
              className="text-sm text-slate-400 underline"
            >
              ログアウト
            </button>
          </p>
        )}
      </div>
    );
  }

  const question = questions[currentIndex];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="text-center text-lg text-slate-600">
        <span className="font-bold text-slate-700">{displayName}　</span>
        問題 {currentIndex + 1} / {questions.length}　Lv{level} {level ? LEVEL_NAMES[level] : ""}
      </div>

      <section
        className={`card text-center transition-transform ${feedbackType === "success" ? "animate-success" : feedbackType === "retry" ? "animate-retry" : ""}`}
      >
        <p className="mb-6 text-5xl font-bold text-slate-800 sm:text-6xl">
          {question.operandA} + {question.operandB} = ?
        </p>
        <div className="mb-6 min-h-16 rounded-2xl bg-slate-100 px-4 py-4 text-4xl font-bold text-slate-800">
          {answer || "?"}
        </div>
        {feedback && (
          <p className={feedbackType === "success" ? "feedback-success" : "feedback-retry"}>
            {feedback}
          </p>
        )}
      </section>

      <Keypad
        value={answer}
        onChange={setAnswer}
        onSubmit={submitAnswer}
        disabled={submitting}
      />

      {error && <p className="feedback-error">{error}</p>}

      <button
        type="button"
        onClick={backToLevels}
        className="text-center text-sky-600 underline"
      >
        やめる
      </button>
    </div>
  );
}
