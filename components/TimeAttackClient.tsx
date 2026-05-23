"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  failTimeAttackTimeoutAction,
  submitTimeAttackAnswerAction,
} from "@/app/actions/time-attack";
import { Keypad } from "@/components/Keypad";
import { OniBossDisplay } from "@/components/OniBossDisplay";
import { QuestionTimer } from "@/components/QuestionTimer";
import { QuizMascot } from "@/components/QuizMascot";
import { RunningScore, SCORE_FLY_DELAY_MS, SCORE_FLY_DURATION_MS } from "@/components/RunningScore";
import { TimeAttackScoreBar } from "@/components/TimeAttackScoreBar";
import type { AuthState } from "@/lib/auth/state";
import type { Question } from "@/lib/db/schema";
import { getBossLabel, type TimeAttackState } from "@/lib/time-attack";
import { MAX_MISTAKES } from "@/lib/time-attack-scoring";
import {
  formatQuestionExpression,
  getMaxAnswerDigits,
} from "@/lib/questions";
import { useIsClient } from "@/lib/use-is-client";

type InitialSession = {
  sessionId: string;
  questions: Question[];
  timeAttackState: TimeAttackState;
};

type TimeAttackClientProps = {
  auth: AuthState;
  initialSession: InitialSession;
};

const SUCCESS_FEEDBACK_MS = 1200;
const WRONG_FEEDBACK_MS = 900;
const BEAM_ANIMATION_MS = 1800;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function TimeAttackClient({ auth, initialSession }: TimeAttackClientProps) {
  const router = useRouter();
  const isClient = useIsClient();
  const sessionId = initialSession.sessionId;
  const [questions, setQuestions] = useState(initialSession.questions);
  const [timeAttackState, setTimeAttackState] = useState<TimeAttackState>(
    initialSession.timeAttackState,
  );
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "wrong" | null>(null);
  const [alertType, setAlertType] = useState<"yellow" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runningScore, setRunningScore] = useState(initialSession.timeAttackState.totalScore);
  const [pendingPoints, setPendingPoints] = useState<number | null>(null);
  const [pendingFlyLabel, setPendingFlyLabel] = useState<string | null>(null);
  const [scoreAnimId, setScoreAnimId] = useState(0);
  const [beamActive, setBeamActive] = useState(false);
  const [beamScore, setBeamScore] = useState(0);
  const [timerPaused, setTimerPaused] = useState(false);
  const [waveMessage, setWaveMessage] = useState<string | null>(null);

  const questionStartedAtRef = useRef<number>(0);
  const submitLockRef = useRef(false);
  const pointsEarnedRef = useRef<HTMLParagraphElement>(null);
  const quizPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    questionStartedAtRef.current = Date.now();
    document.documentElement.classList.add("quiz-active");
    document.body.classList.add("quiz-active");
    return () => {
      document.documentElement.classList.remove("quiz-active");
      document.body.classList.remove("quiz-active");
    };
  }, []);

  const getElapsedSeconds = () => (Date.now() - questionStartedAtRef.current) / 1000;

  const redirectToResult = useCallback(
    (id: string) => {
      router.push(`/result/time-attack/${id}`);
    },
    [router],
  );

  const handleTimeout = useCallback(async () => {
    if (!sessionId || submitLockRef.current || !timeAttackState) {
      return;
    }
    submitLockRef.current = true;
    setSubmitting(true);
    setTimerPaused(true);
    try {
      await failTimeAttackTimeoutAction(sessionId);
      redirectToResult(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "時間切れ処理に失敗しました");
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }, [sessionId, timeAttackState, redirectToResult]);

  const advanceAfterWave = async (
    id: string,
    result: {
      waveComplete?: boolean;
      waveScore?: number;
      bossDefeated?: boolean;
      defeatBonus?: number;
      cleared?: boolean;
      sessionEnded?: boolean;
      timeAttackState?: TimeAttackState;
      questions?: Question[];
    },
  ) => {
    if (!result.waveComplete) {
      return;
    }

    setTimerPaused(true);
    setBeamScore(result.waveScore ?? 0);
    setBeamActive(true);

    const beamMs = prefersReducedMotion() ? 400 : BEAM_ANIMATION_MS;
    await new Promise((resolve) => setTimeout(resolve, beamMs));
    setBeamActive(false);

    if (result.bossDefeated) {
      setWaveMessage(
        result.cleared
          ? `閻魔大王を倒した！クリア！ +${result.defeatBonus ?? 0}点`
          : `ボス撃破！ +${result.defeatBonus ?? 0}点ボーナス`,
      );
      await new Promise((resolve) => setTimeout(resolve, prefersReducedMotion() ? 300 : 1200));
    }

    if (result.sessionEnded) {
      redirectToResult(id);
      return;
    }

    if (result.timeAttackState && result.questions) {
      setTimeAttackState(result.timeAttackState);
      setQuestions(result.questions);
      setRunningScore(result.timeAttackState.totalScore);
      setAnswer("");
      setWaveMessage(null);
      questionStartedAtRef.current = Date.now();
      setTimerPaused(false);
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const submitAnswer = async () => {
    if (!sessionId || !timeAttackState || submitLockRef.current || !answer) {
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);
    setTimerPaused(true);
    setAlertType(null);

    const elapsedSeconds = getElapsedSeconds();
    const numericAnswer = Number(answer);

    try {
      const result = await submitTimeAttackAnswerAction(
        sessionId,
        numericAnswer,
        elapsedSeconds,
      );

      if ("timedOut" in result && result.timedOut) {
        redirectToResult(sessionId);
        return;
      }

      if (result.sessionEnded) {
        if ("waveComplete" in result && result.waveComplete) {
          await advanceAfterWave(sessionId, result);
          if (!("cleared" in result && result.cleared)) {
            redirectToResult(sessionId);
          }
        } else {
          redirectToResult(sessionId);
        }
        return;
      }

      if (result.correct) {
        setFeedback("正解！");
        setFeedbackType("success");
        setPendingPoints(result.pointsEarned);
        setPendingFlyLabel(`+${result.pointsEarned}点`);
        setScoreAnimId((id) => id + 1);
        if (result.timeAttackState) {
          setTimeAttackState(result.timeAttackState);
          setRunningScore(result.timeAttackState.totalScore);
        }

        if ("waveComplete" in result && result.waveComplete) {
          setTimeout(async () => {
            setFeedback(null);
            setFeedbackType(null);
            await advanceAfterWave(sessionId, result);
          }, prefersReducedMotion() ? 200 : SUCCESS_FEEDBACK_MS);
          return;
        }

        setTimeout(() => {
          setFeedback(null);
          setFeedbackType(null);
          setPendingPoints(null);
          setAnswer("");
          questionStartedAtRef.current = Date.now();
          setTimerPaused(false);
          submitLockRef.current = false;
          setSubmitting(false);
        }, prefersReducedMotion() ? 200 : SUCCESS_FEEDBACK_MS);
        return;
      }

      setFeedback("不正解…");
      setFeedbackType("wrong");
      setAlertType("yellow");
      if (result.timeAttackState) {
        setTimeAttackState(result.timeAttackState);
      }

      if ("waveComplete" in result && result.waveComplete) {
        setTimeout(async () => {
          setFeedback(null);
          setFeedbackType(null);
          setAlertType(null);
          await advanceAfterWave(sessionId, result);
        }, prefersReducedMotion() ? 200 : WRONG_FEEDBACK_MS);
        return;
      }

      setTimeout(() => {
        setFeedback(null);
        setFeedbackType(null);
        setAlertType(null);
        setAnswer("");
        questionStartedAtRef.current = Date.now();
        setTimerPaused(false);
        submitLockRef.current = false;
        setSubmitting(false);
      }, prefersReducedMotion() ? 200 : WRONG_FEEDBACK_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "回答の送信に失敗しました");
      submitLockRef.current = false;
      setSubmitting(false);
      setTimerPaused(false);
    }
  };

  const backToPlay = () => {
    router.push("/play");
  };

  if (!isClient) {
    return <p className="text-center text-lg text-muted">読み込み中...</p>;
  }

  if (error && !sessionId) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <p className="feedback-error">{error}</p>
        <Link href="/play" className="big-btn big-btn-secondary mt-4 inline-block">
          もどる
        </Link>
      </div>
    );
  }

  const question = questions[timeAttackState.waveQuestionIndex];
  const questionKey = `${sessionId}-${timeAttackState.globalQuestionIndex}`;

  return (
    <div ref={quizPanelRef} className="time-attack-client mx-auto flex w-full max-w-xl flex-col gap-4">
      {alertType === "yellow" && (
        <div className="time-attack-alert time-attack-alert--yellow" aria-hidden="true" />
      )}

      <OniBossDisplay state={timeAttackState} beamActive={beamActive} beamScore={beamScore} />

      <header className="quiz-header relative flex min-h-[4.5rem] items-start">
        <QuizMascot comment={waveMessage} onHomeClick={backToPlay} />
        <div className="pointer-events-none absolute inset-x-0 top-0 px-14 text-center text-lg text-muted sm:px-16">
          <p>
            <span className="font-bold">{auth.loggedIn ? auth.playerName : ""}</span>
          </p>
          <p>
            問題 {timeAttackState.waveQuestionIndex + 1} / {questions.length}　
            {getBossLabel(timeAttackState)}
          </p>
          <p className="text-sm">
            ミス {timeAttackState.mistakeCount}/{MAX_MISTAKES}
          </p>
        </div>
        <div className="ml-auto shrink-0">
          <RunningScore
            score={runningScore}
            pointsEarned={pendingPoints}
            flyLabel={pendingFlyLabel}
            flyDelayMs={SCORE_FLY_DELAY_MS}
            flyDurationMs={SCORE_FLY_DURATION_MS}
            animId={scoreAnimId}
            getFlyFromElement={() => pointsEarnedRef.current}
            onPointsApplied={() => setPendingPoints(null)}
          />
        </div>
      </header>

      <QuestionTimer
        key={questionKey}
        timeLimitSeconds={timeAttackState.timeLimitSeconds}
        questionKey={questionKey}
        onTimeout={() => void handleTimeout()}
        paused={timerPaused || submitting}
      />

      <TimeAttackScoreBar state={timeAttackState} />

      {question && (
        <section
          className={`card relative z-10 text-center transition-transform ${feedbackType === "success" ? "animate-success" : feedbackType === "wrong" ? "animate-retry" : ""}`}
        >
          <div className="chalk-heading equation-display mb-4 flex flex-nowrap items-center justify-center text-[clamp(1.25rem,6vw,3.75rem)] font-bold">
            <span className="whitespace-nowrap">
              {formatQuestionExpression(question)} =
            </span>
            <span className="answer-slot ml-2 shrink-0">{answer || "?"}</span>
          </div>
        </section>
      )}

      {feedback && (
        <div
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-6"
          role="status"
          aria-live="polite"
        >
          <div
            className={`feedback-popup ${feedbackType === "success" ? "feedback-popup-success" : "feedback-popup-retry"}`}
          >
            <p className={feedbackType === "success" ? "feedback-success" : "feedback-retry"}>
              {feedback}
            </p>
            {feedbackType === "success" && pendingPoints != null && (
              <p ref={pointsEarnedRef} className="feedback-points-earned">
                +{pendingPoints}点
              </p>
            )}
          </div>
        </div>
      )}

      <Keypad
        value={answer}
        onChange={setAnswer}
        onSubmit={() => void submitAnswer()}
        disabled={submitting || timerPaused}
        maxDigits={getMaxAnswerDigits(timeAttackState.currentLevel)}
      />

      {error && <p className="feedback-error">{error}</p>}
    </div>
  );
}
