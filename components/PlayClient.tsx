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
import { MAX_LEVEL } from "@/lib/levels";
import { type Level } from "@/lib/questions";

type Question = {
  operandA: number;
  operandB: number;
};

type PlayClientProps = {
  auth: AuthState;
};

const SUCCESS_FEEDBACK_MS = 1500;
const COMPLETION_FEEDBACK_MS = 1800;
const RETRY_FEEDBACK_MS = 1500;

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
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFeedback = () => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    setFeedback(null);
    setFeedbackType(null);
  };

  const showRetryFeedback = (message: string) => {
    clearFeedback();
    setFeedback(message);
    setFeedbackType("retry");
    feedbackTimeoutRef.current = setTimeout(clearFeedback, RETRY_FEEDBACK_MS);
  };

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

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
      clearFeedback();
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
    clearFeedback();

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
          showRetryFeedback(result.message);
          setAnswer("");
          return;
        }

        setFeedback(result.message);
        setFeedbackType("success");

        if (result.completed) {
          setTimeout(() => {
            router.push(`/result/${activeId}`);
          }, COMPLETION_FEEDBACK_MS);
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
          showRetryFeedback(result.message);
          setAnswer("");
          return;
        }

        setFeedback(result.message);
        setFeedbackType("success");

        if (result.completed) {
          setTimeout(() => {
            router.push(`/result/guest/${activeId}`);
          }, COMPLETION_FEEDBACK_MS);
          return;
        }
      }

      setTimeout(() => {
        setCurrentIndex((index) => index + 1);
        setAnswer("");
        clearFeedback();
      }, SUCCESS_FEEDBACK_MS);
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
    clearFeedback();
    setError(null);
  };

  const handleAnswerChange = (value: string) => {
    if (feedbackType === "retry") {
      clearFeedback();
    }
    setAnswer(value);
  };

  if (!isClient) {
    return <p className="text-center text-lg text-muted">読み込み中...</p>;
  }

  if (!sessionId && !localId) {
    return (
      <>
        <header className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <img
              src="/mascot.png"
              alt=""
              width={155}
              height={312}
              className="h-20 w-auto shrink-0 sm:h-24"
              aria-hidden
            />
            <h1 className="chalk-heading text-4xl font-bold sm:text-5xl">たしざん れんしゅう</h1>
          </div>
          <p className="mt-2 text-lg text-muted">10問チャレンジ！</p>
        </header>
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <p className="text-center text-xl font-bold">{displayName}</p>
        <h2 className="chalk-heading text-center text-3xl font-bold">レベルを選ぶ</h2>
        {Array.from({ length: MAX_LEVEL }, (_, index) => {
          const lv = (index + 1) as Level;
          const disabled = lv > effectiveUnlocked;
          return (
            <button
              key={lv}
              type="button"
              disabled={submitting || disabled}
              onClick={() => startSession(lv)}
              className="big-btn disabled:opacity-40"
            >
              Lv{lv}
            </button>
          );
        })}
        {error && <p className="feedback-error">{error}</p>}
        <Link href="/progress" className="big-btn big-btn-secondary text-center">
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
              className="text-dim text-sm underline"
            >
              ログアウト
            </button>
          </p>
        )}
        </div>
      </>
    );
  }

  const question = questions[currentIndex];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="text-center text-lg text-muted">
        <span className="font-bold">{displayName}　</span>
        問題 {currentIndex + 1} / {questions.length}　Lv{level}
      </div>

      <section
        className={`card text-center transition-transform ${feedbackType === "success" ? "animate-success" : feedbackType === "retry" ? "animate-retry" : ""}`}
      >
        <div className="chalk-heading mb-6 flex items-center justify-center gap-x-2 text-[clamp(1.5rem,8vw,3.75rem)] font-bold">
          <span className="whitespace-nowrap">
            {question.operandA} + {question.operandB} =
          </span>
          <span className="answer-slot">
            {answer || "?"}
          </span>
        </div>
      </section>

      {feedback && (
        <div
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-6"
          role="status"
          aria-live="polite"
        >
          {feedbackType === "success" && (
            <div className="feedback-success-glow" aria-hidden="true" />
          )}
          {feedbackType === "success" ? (
            <div className="feedback-popup feedback-popup-success">
              <div className="feedback-confetti" aria-hidden="true">
                {["✨", "⭐", "🎉", "✨", "⭐", "🎊", "✨", "⭐"].map((icon, index) => (
                  <span key={index} className="feedback-confetti-piece">
                    {icon}
                  </span>
                ))}
              </div>
              <p className="feedback-success">🎉 {feedback} 🎉</p>
            </div>
          ) : (
            <div className="feedback-popup feedback-popup-retry">
              <p className="feedback-retry">{feedback}</p>
            </div>
          )}
        </div>
      )}

      <Keypad
        value={answer}
        onChange={handleAnswerChange}
        onSubmit={submitAnswer}
        disabled={submitting}
      />

      {error && <p className="feedback-error">{error}</p>}

      <button
        type="button"
        onClick={backToLevels}
        className="text-link text-center"
      >
        やめる
      </button>
    </div>
  );
}
