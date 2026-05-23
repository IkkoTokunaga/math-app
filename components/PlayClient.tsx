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
import { useQuizPanelFit } from "@/lib/use-quiz-panel-fit";
import { MAX_LEVEL } from "@/lib/levels";
import {
  formatQuestionExpression,
  getMaxAnswerDigits,
  type Level,
} from "@/lib/questions";
import {
  SCORE_TIME_GRACE_SECONDS,
  STAR_COUNT,
  calculateMaxPossibleSessionScore,
  calculateStars,
} from "@/lib/scoring";

import {
  SESSION_COMPLETE_MASCOT_COMMENT,
  pickRandomMascotComment,
} from "@/lib/mascot-comments";
import type { Question } from "@/lib/db/schema";
import { applyDevUnlock, getDevUnlockFromSearch } from "@/lib/dev-unlock-setup";
import {
  getMemberCelebratedLevelsAction,
  markMemberUnlockCelebratedAction,
} from "@/app/actions/unlock-celebration";
import {
  getPendingGuestUnlockCelebration,
  markGuestUnlockCelebrated,
} from "@/lib/guest-unlock-celebration";
import {
  UNLOCK_CELEBRATION_MS,
  UNLOCK_SCROLL_DELAY_MS,
  getPendingUnlockCelebration,
} from "@/lib/unlock-celebration-core";

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
  const [memberCelebrationsReady, setMemberCelebrationsReady] = useState(false);
  const memberCelebratedRef = useRef<Level[]>([]);
  const [celebratingLevel, setCelebratingLevel] = useState<Level | null>(null);
  const [devUnlockApplied, setDevUnlockApplied] = useState(false);
  const levelCellRefs = useRef<Map<Level, HTMLDivElement>>(new Map());
  const questionStartedAtRef = useRef<number>(0);
  const submitLockRef = useRef(false);
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

  const resetQuestionTimer = useCallback(() => {
    questionStartedAtRef.current = Date.now() + SCORE_TIME_GRACE_SECONDS * 1000;
  }, []);

  useEffect(() => {
    if (sessionId || localId) {
      resetQuestionTimer();
    }
  }, [currentIndex, sessionId, localId, resetQuestionTimer]);

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

  useQuizPanelFit(quizPanelRef, inQuiz);

  const guestUnlocked = isClient ? getGuestUnlockedLevel() : 1;
  const effectiveUnlocked = auth.loggedIn ? unlockedLevel : guestUnlocked;
  const inLevelSelect = !sessionId && !localId;

  useEffect(() => {
    if (!isClient || !inLevelSelect || devUnlockApplied) {
      return;
    }

    const targetLevel = getDevUnlockFromSearch(window.location.search);
    if (targetLevel == null) {
      return;
    }

    applyDevUnlock(targetLevel);
    setDevUnlockApplied(true);

    const url = new URL(window.location.href);
    url.searchParams.delete("devUnlock");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, [isClient, inLevelSelect, devUnlockApplied]);

  useEffect(() => {
    if (auth.loggedIn) {
      getPlayerUnlockedLevelAction(auth.playerId)
        .then(setUnlockedLevel)
        .catch(() => setUnlockedLevel(1));
    }
  }, [auth]);

  useEffect(() => {
    if (!isClient || !inLevelSelect || !auth.loggedIn) {
      return;
    }

    getPlayerUnlockedLevelAction(auth.playerId)
      .then(setUnlockedLevel)
      .catch(() => setUnlockedLevel(1));
  }, [isClient, inLevelSelect, auth]);

  useEffect(() => {
    if (!isClient || !inLevelSelect) {
      return;
    }

    if (!auth.loggedIn) {
      memberCelebratedRef.current = [];
      return;
    }

    let cancelled = false;
    setMemberCelebrationsReady(false);

    getMemberCelebratedLevelsAction(auth.playerId)
      .then((levels) => {
        if (!cancelled) {
          memberCelebratedRef.current = levels;
          setMemberCelebrationsReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          memberCelebratedRef.current = [];
          setMemberCelebrationsReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isClient, inLevelSelect, auth]);

  useEffect(() => {
    if (!isClient || !inLevelSelect) {
      setCelebratingLevel(null);
      return;
    }

    if (auth.loggedIn && !memberCelebrationsReady) {
      return;
    }

    let cancelled = false;
    let animTimer = 0;
    let endTimer = 0;

    const run = async () => {
      const pending = auth.loggedIn
        ? getPendingUnlockCelebration(memberCelebratedRef.current, effectiveUnlocked)
        : getPendingGuestUnlockCelebration(effectiveUnlocked);

      if (pending == null) {
        if (!cancelled) {
          setCelebratingLevel(null);
        }
        return;
      }

      const recordCelebrated = async () => {
        if (auth.loggedIn) {
          await markMemberUnlockCelebratedAction(auth.playerId, pending);
          if (cancelled) {
            return;
          }
          const next = new Set(memberCelebratedRef.current);
          next.add(pending);
          memberCelebratedRef.current = Array.from(next).sort((a, b) => a - b) as Level[];
        } else {
          markGuestUnlockCelebrated(pending);
        }
      };

      if (prefersReducedMotion()) {
        await recordCelebrated();
        if (!cancelled) {
          setCelebratingLevel(null);
        }
        return;
      }

      const cell = levelCellRefs.current.get(pending);
      requestAnimationFrame(() => {
        cell?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });

      animTimer = window.setTimeout(() => {
        if (cancelled) {
          return;
        }
        setCelebratingLevel(pending);
        void recordCelebrated();
      }, UNLOCK_SCROLL_DELAY_MS);

      endTimer = window.setTimeout(() => {
        setCelebratingLevel(null);
      }, UNLOCK_SCROLL_DELAY_MS + UNLOCK_CELEBRATION_MS);
    };

    void run();

    return () => {
      cancelled = true;
      window.clearTimeout(animTimer);
      window.clearTimeout(endTimer);
    };
  }, [isClient, inLevelSelect, effectiveUnlocked, auth, memberCelebrationsReady]);

  useEffect(() => {
    if (celebratingLevel == null) {
      document.documentElement.classList.remove("level-unlock-active");
      document.body.classList.remove("level-unlock-active");
      return;
    }

    document.documentElement.classList.add("level-unlock-active");
    document.body.classList.add("level-unlock-active");
    return () => {
      document.documentElement.classList.remove("level-unlock-active");
      document.body.classList.remove("level-unlock-active");
    };
  }, [celebratingLevel]);

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
      resetQuestionTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "セッション開始に失敗しました");
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const submitAnswer = async () => {
    const activeId = isMember ? sessionId : localId;
    if (!activeId || answer.length === 0 || submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);
    clearFeedback();

    const elapsedSeconds = Math.max(
      0,
      (Date.now() - questionStartedAtRef.current) / 1000,
    );

    let releaseSubmitLock = true;

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
          releaseSubmitLock = false;
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
          releaseSubmitLock = false;
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
      releaseSubmitLock = false;
      setTimeout(() => {
        setCurrentIndex((index) => index + 1);
        setAnswer("");
        clearFeedback();
        submitLockRef.current = false;
        setSubmitting(false);
      }, feedbackDurationMs(awards, SUCCESS_FEEDBACK_MS));
    } catch (err) {
      setError(err instanceof Error ? err.message : "回答の送信に失敗しました");
    } finally {
      if (releaseSubmitLock) {
        submitLockRef.current = false;
        setSubmitting(false);
      }
    }
  };

  const backToLevels = () => {
    submitLockRef.current = false;
    setSubmitting(false);
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
            <h1 className="chalk-heading text-4xl font-bold sm:text-5xl">たしざん</h1>
          </div>
          <p className="mt-2 text-lg text-muted">モードを選んでね</p>
        </header>
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
          <p className="text-center text-xl font-bold">{displayName}</p>
          <Link href="/progress" className="big-btn big-btn-secondary text-center">
            これまでの記録
          </Link>
          <h2 className="chalk-heading text-center text-3xl font-bold">モードを選ぶ</h2>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("standard-mode-section");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="big-btn big-btn-primary"
          >
            通常モード（10問チャレンジ）
          </button>
          {auth.loggedIn ? (
            <Link href="/play/time-attack" className="big-btn big-btn-secondary text-center">
              タイムアタック（鬼退治）
            </Link>
          ) : (
            <div className="mode-select-locked">
              <button type="button" disabled className="big-btn w-full opacity-50">
                🔒 タイムアタック（鬼退治）
              </button>
              <p className="mt-2 text-center text-sm text-muted">
                タイムアタックはログインすると遊べます
              </p>
            </div>
          )}
          <div id="standard-mode-section" className="mt-4">
            <h2 className="chalk-heading text-center text-3xl font-bold">レベルを選ぶ</h2>
        <div className={`level-select-list ${celebratingLevel != null ? "level-select-list--celebrating" : ""}`}>
        {Array.from({ length: MAX_LEVEL }, (_, index) => {
          const lv = (index + 1) as Level;
          const disabled = lv > effectiveUnlocked;
          const isUnlocking = celebratingLevel === lv;
          return (
            <div
              key={lv}
              ref={(element) => {
                if (element) {
                  levelCellRefs.current.set(lv, element);
                } else {
                  levelCellRefs.current.delete(lv);
                }
              }}
              className={`level-unlock-cell ${isUnlocking ? "level-unlock-cell--active" : ""}`}
            >
              {isUnlocking && (
                <div className="level-unlock-fx" aria-hidden="true">
                  <span className="level-unlock-flash" />
                  <span className="level-unlock-wave level-unlock-wave--1" />
                  <span className="level-unlock-wave level-unlock-wave--2" />
                  <span className="level-unlock-spark level-unlock-spark--1">✦</span>
                  <span className="level-unlock-spark level-unlock-spark--2">★</span>
                  <span className="level-unlock-spark level-unlock-spark--3">✦</span>
                  <span className="level-unlock-spark level-unlock-spark--4">★</span>
                  <span className="level-unlock-spark level-unlock-spark--5">✦</span>
                  <span className="level-unlock-spark level-unlock-spark--6">★</span>
                </div>
              )}
              <button
                type="button"
                disabled={submitting || disabled}
                onClick={() => startSession(lv)}
                className={`big-btn disabled:opacity-40 ${isUnlocking ? "big-btn--unlocking" : ""}`}
                aria-label={isUnlocking ? `Lv${lv} が新しく解放されました` : undefined}
              >
                Lv{lv}
              </button>
            </div>
          );
        })}
        </div>
          </div>
        {error && <p className="feedback-error">{error}</p>}
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
        <div className="chalk-heading equation-display mb-6 flex flex-nowrap items-center justify-center text-[clamp(1.25rem,6vw,3.75rem)] font-bold">
          <span className="whitespace-nowrap">
            {formatQuestionExpression(question)} =
          </span>
          <span className="answer-slot ml-2 shrink-0">
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
        maxDigits={level != null ? getMaxAnswerDigits(level) : 3}
      />

      {error && <p className="feedback-error">{error}</p>}
    </div>
  );
}
