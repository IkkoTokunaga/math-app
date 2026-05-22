"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import {
  getPlayerUnlockedLevelAction,
  startSessionAction,
  submitAnswerAction,
} from "@/app/actions/session";
import { AuthLinks } from "@/components/AuthLinks";
import { Keypad } from "@/components/Keypad";
import { QuizMascot } from "@/components/QuizMascot";
import {
  COMPLETION_BAR_FILL_MS,
  LiveScoreProgressBar,
} from "@/components/LiveScoreProgressBar";
import { RunningScore, SCORE_FLY_DELAY_MS, SCORE_FLY_DURATION_MS } from "@/components/RunningScore";
import type { AuthState } from "@/lib/auth/state";
import { getGuestLabel } from "@/lib/guest-storage";
import {
  getGuestUnlockedLevel,
  startGuestSession,
  submitGuestAnswer,
} from "@/lib/guest-session";
import { useIsClient } from "@/lib/use-is-client";
import { MAX_LEVEL } from "@/lib/levels";
import {
  SESSION_COMPLETE_MASCOT_COMMENT,
  pickRandomMascotComment,
} from "@/lib/mascot-comments";
import { type Level } from "@/lib/questions";
import {
  STAR_COUNT,
  calculateMaxPossibleSessionScore,
  calculateStars,
} from "@/lib/scoring";

type Question = {
  operandA: number;
  operandB: number;
};

type CorrectAnswerPoints = {
  basePoints: number;
  timeBonus: number;
  pointsEarned: number;
  streakBonusEarned: number;
};

const STREAK_FLY_DELAY_MS = 80;
const STREAK_FLY_DURATION_MS = 420;

type ScoreAward = {
  amount: number;
  flyLabel: string;
  flyFromRef: React.RefObject<HTMLParagraphElement | null>;
  flyDelayMs?: number;
  flyDurationMs?: number;
  flyClassName?: string;
};

type PlayClientProps = {
  auth: AuthState;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function awardAnimMs(award: ScoreAward): number {
  return (award.flyDelayMs ?? SCORE_FLY_DELAY_MS) + (award.flyDurationMs ?? SCORE_FLY_DURATION_MS);
}

function feedbackDurationMs(awards: ScoreAward[], baseMs: number): number {
  if (awards.length <= 1) {
    return baseMs;
  }
  return baseMs + awards.slice(1).reduce((sum, award) => sum + awardAnimMs(award), 0);
}

function buildScoreAwards(
  points: CorrectAnswerPoints,
  refs: {
    pointsEarnedRef: React.RefObject<HTMLParagraphElement | null>;
    streakBonusRef: React.RefObject<HTMLParagraphElement | null>;
  },
): ScoreAward[] {
  const awards: ScoreAward[] = [
    {
      amount: points.pointsEarned,
      flyLabel: `+${points.pointsEarned}点`,
      flyFromRef: refs.pointsEarnedRef,
    },
  ];

  if (points.streakBonusEarned > 0) {
    awards.push({
      amount: points.streakBonusEarned,
      flyLabel: `+${points.streakBonusEarned} 連続ボーナス!`,
      flyFromRef: refs.streakBonusRef,
      flyDelayMs: STREAK_FLY_DELAY_MS,
      flyDurationMs: STREAK_FLY_DURATION_MS,
      flyClassName: "score-fly-badge--streak",
    });
  }

  return awards;
}

function willPerfectOnFinalQuestion(
  level: Level,
  questionCount: number,
  currentIndex: number,
  runningScore: number,
  points: CorrectAnswerPoints,
): boolean {
  if (currentIndex !== questionCount - 1) {
    return false;
  }
  const projectedScore = runningScore + points.pointsEarned + points.streakBonusEarned;
  const maxPossibleScore = calculateMaxPossibleSessionScore(level, questionCount);
  return calculateStars(projectedScore, maxPossibleScore) >= STAR_COUNT;
}

function completionRedirectMs(awards: ScoreAward[], fillToEnd: boolean): number {
  const base = feedbackDurationMs(awards, COMPLETION_FEEDBACK_MS);
  if (!fillToEnd || prefersReducedMotion()) {
    return base;
  }
  return base + COMPLETION_BAR_FILL_MS;
}

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
  const [mascotComment, setMascotComment] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runningScore, setRunningScore] = useState(0);
  const [pendingPoints, setPendingPoints] = useState<number | null>(null);
  const [pendingFlyLabel, setPendingFlyLabel] = useState<string | null>(null);
  const [pendingFlyDelayMs, setPendingFlyDelayMs] = useState(SCORE_FLY_DELAY_MS);
  const [pendingFlyDurationMs, setPendingFlyDurationMs] = useState(SCORE_FLY_DURATION_MS);
  const [pendingFlyClassName, setPendingFlyClassName] = useState("");
  const [feedbackPoints, setFeedbackPoints] = useState<CorrectAnswerPoints | null>(null);
  const [scoreAnimId, setScoreAnimId] = useState(0);
  const [fillBarToEnd, setFillBarToEnd] = useState(false);
  const [unlockedLevel, setUnlockedLevel] = useState<Level>(1);
  const questionStartedAtRef = useRef<number>(0);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointsEarnedRef = useRef<HTMLParagraphElement>(null);
  const streakBonusRef = useRef<HTMLParagraphElement>(null);
  const flyFromSourceRef = useRef<React.RefObject<HTMLParagraphElement | null>>(pointsEarnedRef);
  const pendingPointsRef = useRef(0);
  const awardQueueRef = useRef<ScoreAward[]>([]);

  const getFlyFromElement = useCallback(() => flyFromSourceRef.current.current, []);

  const startNextScoreAward = useCallback(() => {
    const next = awardQueueRef.current.shift();
    if (!next) {
      return;
    }

    flyFromSourceRef.current = next.flyFromRef;
    pendingPointsRef.current = next.amount;
    setPendingFlyLabel(next.flyLabel);
    setPendingFlyDelayMs(next.flyDelayMs ?? SCORE_FLY_DELAY_MS);
    setPendingFlyDurationMs(next.flyDurationMs ?? SCORE_FLY_DURATION_MS);
    setPendingFlyClassName(next.flyClassName ?? "");
    setPendingPoints(next.amount);
    setScoreAnimId((id) => id + 1);
  }, []);

  const queueScoreAwards = useCallback(
    (points: CorrectAnswerPoints) => {
      const awards = buildScoreAwards(points, {
        pointsEarnedRef,
        streakBonusRef,
      });
      const totalAward = points.pointsEarned + points.streakBonusEarned;

      setFeedbackPoints(points);

      if (prefersReducedMotion()) {
        setRunningScore((score) => score + totalAward);
        setPendingPoints(null);
        setPendingFlyLabel(null);
        awardQueueRef.current = [];
        return;
      }

      awardQueueRef.current = awards;
      requestAnimationFrame(() => {
        startNextScoreAward();
      });
    },
    [startNextScoreAward],
  );

  const applyPendingPoints = useCallback(() => {
    setRunningScore((score) => score + pendingPointsRef.current);
    setPendingPoints(null);
    setPendingFlyLabel(null);

    if (awardQueueRef.current.length > 0) {
      startNextScoreAward();
    }
  }, [startNextScoreAward]);

  const clearFeedback = () => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    setFeedback(null);
    setFeedbackType(null);
    setMascotComment(null);
    setPendingPoints(null);
    setPendingFlyLabel(null);
    setFeedbackPoints(null);
    awardQueueRef.current = [];
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

  const inQuiz = Boolean(sessionId || localId);
  const quizPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shell = document.querySelector(".page-shell");
    if (!shell) {
      return;
    }
    shell.classList.toggle("page-shell--quiz", inQuiz);
    document.documentElement.classList.toggle("quiz-active", inQuiz);
    document.body.classList.toggle("quiz-active", inQuiz);
    return () => {
      shell.classList.remove("page-shell--quiz");
      document.documentElement.classList.remove("quiz-active");
      document.body.classList.remove("quiz-active");
    };
  }, [inQuiz]);

  useEffect(() => {
    if (!inQuiz) {
      return;
    }

    const panel = quizPanelRef.current;
    const shell = document.querySelector(".page-shell");
    if (!panel || !shell) {
      return;
    }

    let frame = 0;

    const fitPanel = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        panel.style.transform = "none";
        panel.style.marginBottom = "";

        const available = shell.clientHeight;
        const needed = panel.offsetHeight;
        if (needed <= available || needed === 0) {
          return;
        }

        const scale = available / needed;
        panel.style.transform = `scale(${scale})`;
        panel.style.transformOrigin = "top center";
        panel.style.marginBottom = `${needed * (scale - 1)}px`;
      });
    };

    const observer = new ResizeObserver(fitPanel);
    observer.observe(panel);
    observer.observe(shell);
    window.addEventListener("resize", fitPanel);
    fitPanel();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", fitPanel);
      panel.style.transform = "";
      panel.style.marginBottom = "";
    };
  }, [inQuiz, currentIndex, level, error, submitting]);

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
      setRunningScore(0);
      setFillBarToEnd(false);
      setPendingPoints(null);
      setPendingFlyLabel(null);
      setFeedbackPoints(null);
      pendingPointsRef.current = 0;
      awardQueueRef.current = [];
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
      let correctPoints: CorrectAnswerPoints | null = null;

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

        correctPoints = result;
        const awards = buildScoreAwards(result, {
          pointsEarnedRef,
          streakBonusRef,
        });
        setMascotComment(
          result.completed ? SESSION_COMPLETE_MASCOT_COMMENT : pickRandomMascotComment(),
        );
        setFeedback(result.message);
        setFeedbackType("success");
        queueScoreAwards(result);

        if (result.completed) {
          const fillToEnd =
            level != null &&
            willPerfectOnFinalQuestion(
              level,
              questions.length,
              currentIndex,
              runningScore,
              result,
            );
          if (fillToEnd) {
            setFillBarToEnd(true);
          }
          setTimeout(() => {
            router.push(`/result/${activeId}`);
          }, completionRedirectMs(awards, fillToEnd));
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

        correctPoints = result;
        const awards = buildScoreAwards(result, {
          pointsEarnedRef,
          streakBonusRef,
        });
        setMascotComment(
          result.completed ? SESSION_COMPLETE_MASCOT_COMMENT : pickRandomMascotComment(),
        );
        setFeedback(result.message);
        setFeedbackType("success");
        queueScoreAwards(result);

        if (result.completed) {
          const fillToEnd =
            level != null &&
            willPerfectOnFinalQuestion(
              level,
              questions.length,
              currentIndex,
              runningScore,
              result,
            );
          if (fillToEnd) {
            setFillBarToEnd(true);
          }
          setTimeout(() => {
            router.push(`/result/guest/${activeId}`);
          }, completionRedirectMs(awards, fillToEnd));
          return;
        }
      }

      const awards = buildScoreAwards(correctPoints!, {
        pointsEarnedRef,
        streakBonusRef,
      });
      setTimeout(() => {
        setCurrentIndex((index) => index + 1);
        setAnswer("");
        clearFeedback();
      }, feedbackDurationMs(awards, SUCCESS_FEEDBACK_MS));
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
    setRunningScore(0);
    setFillBarToEnd(false);
    setPendingPoints(null);
    setPendingFlyLabel(null);
    setFeedbackPoints(null);
    pendingPointsRef.current = 0;
    awardQueueRef.current = [];
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
    <div
      ref={quizPanelRef}
      className="mx-auto flex w-full max-w-xl flex-col gap-6"
    >
      <header className="quiz-header relative flex min-h-[4.5rem] items-start">
        <QuizMascot comment={mascotComment} onHomeClick={backToLevels} />
        <div className="pointer-events-none absolute inset-x-0 top-0 px-14 text-center text-lg text-muted sm:px-16">
          <p>
            <span className="font-bold">{displayName}</span>
          </p>
          <p>
            問題 {currentIndex + 1} / {questions.length}　Lv{level}
          </p>
        </div>
        <div className="ml-auto shrink-0">
          <RunningScore
            score={runningScore}
            pointsEarned={pendingPoints}
            flyLabel={pendingFlyLabel}
            flyDelayMs={pendingFlyDelayMs}
            flyDurationMs={pendingFlyDurationMs}
            flyClassName={pendingFlyClassName}
            animId={scoreAnimId}
            getFlyFromElement={getFlyFromElement}
            onPointsApplied={applyPendingPoints}
          />
        </div>
      </header>

      {level != null && (
        <LiveScoreProgressBar
          key={sessionId ?? localId ?? "quiz"}
          level={level}
          totalScore={runningScore}
          fillToEnd={fillBarToEnd}
        />
      )}

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
              <div className="feedback-points-slot">
                {feedbackPoints != null && (
                  <div
                    className={
                      feedbackPoints.streakBonusEarned > 0
                        ? "feedback-points-stack feedback-points-stack--with-streak"
                        : "feedback-points-stack"
                    }
                  >
                    <p ref={pointsEarnedRef} className="feedback-points-earned">
                      +{feedbackPoints.pointsEarned}点
                    </p>
                    {feedbackPoints.streakBonusEarned > 0 && (
                      <p ref={streakBonusRef} className="feedback-points-streak">
                        +{feedbackPoints.streakBonusEarned} 連続ボーナス!
                      </p>
                    )}
                  </div>
                )}
              </div>
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
    </div>
  );
}
