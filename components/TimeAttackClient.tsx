"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  failTimeAttackTimeoutAction,
  submitTimeAttackAnswerAction,
} from "@/app/actions/time-attack";
import { Keypad } from "@/components/Keypad";
import { MascotBeam } from "@/components/MascotBeam";
import { QuestionTimer } from "@/components/QuestionTimer";
import { QuizMascot } from "@/components/QuizMascot";
import { SCORE_FLY_DELAY_MS, SCORE_FLY_DURATION_MS } from "@/components/RunningScore";
import { TimeAttackArena } from "@/components/TimeAttackArena";
import { TimeAttackOniScore } from "@/components/TimeAttackOniScore";
import { TimeAttackScoreBar } from "@/components/TimeAttackScoreBar";
import type { AuthState } from "@/lib/auth/state";
import type { Question } from "@/lib/db/schema";
import type { TimeAttackState } from "@/lib/time-attack";
import { MAX_MISTAKES } from "@/lib/time-attack-scoring";
import { TIME_ATTACK_COUNTDOWN_DISABLED } from "@/lib/time-attack-dev";
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
const BEAM_MS = 750;
const DAMAGE_MS = 850;
const DEFEAT_MSG_MS = 1100;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function motionMs(full: number, reduced: number): number {
  return prefersReducedMotion() ? reduced : full;
}

export function TimeAttackClient({ initialSession }: TimeAttackClientProps) {
  const router = useRouter();
  const isClient = useIsClient();
  const sessionId = initialSession.sessionId;
  const [questions, setQuestions] = useState(initialSession.questions);
  const [timeAttackState, setTimeAttackState] = useState<TimeAttackState>(
    initialSession.timeAttackState,
  );
  const [arenaState, setArenaState] = useState<TimeAttackState>(initialSession.timeAttackState);
  const [displayHp, setDisplayHp] = useState(initialSession.timeAttackState.oniHpRemaining);
  const [displayHpMax, setDisplayHpMax] = useState(initialSession.timeAttackState.oniHpMax);
  const [hpHit, setHpHit] = useState(false);
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
  const [beamFiring, setBeamFiring] = useState(false);
  const [previewWaveScore, setPreviewWaveScore] = useState<number | null>(null);
  const [damageAmount, setDamageAmount] = useState(0);
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

  const syncBossDisplay = (state: TimeAttackState) => {
    setArenaState(state);
    setDisplayHp(state.oniHpRemaining);
    setDisplayHpMax(state.oniHpMax);
  };

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
    if (!result.waveComplete || !result.timeAttackState) {
      return;
    }

    const waveScore = result.waveScore ?? 0;
    const hpAfter = result.bossDefeated ? 0 : result.timeAttackState.oniHpRemaining;

    setTimerPaused(true);
    setPreviewWaveScore(waveScore);
    setDamageAmount(waveScore);
    setBeamFiring(true);

    await new Promise((resolve) => setTimeout(resolve, motionMs(BEAM_MS, 280)));
    setBeamFiring(false);

    setHpHit(true);
    setDisplayHp(hpAfter);

    await new Promise((resolve) => setTimeout(resolve, motionMs(DAMAGE_MS, 320)));
    setHpHit(false);

    if (result.bossDefeated) {
      setWaveMessage(
        result.cleared
          ? `閻魔大王を倒した！クリア！ +${result.defeatBonus ?? 0}点`
          : `ボス撃破！ +${result.defeatBonus ?? 0}点ボーナス`,
      );
      await new Promise((resolve) => setTimeout(resolve, motionMs(DEFEAT_MSG_MS, 400)));

      if (result.sessionEnded) {
        redirectToResult(id);
        return;
      }

      syncBossDisplay(result.timeAttackState);
    } else {
      setArenaState(result.timeAttackState);
      setDisplayHpMax(result.timeAttackState.oniHpMax);
    }

    setPreviewWaveScore(null);
    setTimeAttackState(result.timeAttackState);
    if (result.questions) {
      setQuestions(result.questions);
    }
    setRunningScore(result.timeAttackState.totalScore);
    setAnswer("");
    if (!result.bossDefeated) {
      setWaveMessage(null);
    }
    questionStartedAtRef.current = Date.now();
    setTimerPaused(false);
    submitLockRef.current = false;
    setSubmitting(false);

    if (result.bossDefeated && !result.sessionEnded) {
      setWaveMessage(null);
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
          }, motionMs(SUCCESS_FEEDBACK_MS, 200));
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
        }, motionMs(SUCCESS_FEEDBACK_MS, 200));
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
        }, motionMs(WRONG_FEEDBACK_MS, 200));
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
      }, motionMs(WRONG_FEEDBACK_MS, 200));
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
    <div ref={quizPanelRef} className="time-attack-client mx-auto flex w-full max-w-xl flex-col gap-3">
      <MascotBeam active={beamFiring} intensity={previewWaveScore ?? damageAmount} />

      {alertType === "yellow" && (
        <div className="time-attack-alert time-attack-alert--yellow" aria-hidden="true" />
      )}

      <div className="time-attack-top relative z-20">
        <QuizMascot
          className="time-attack-top__mascot"
          comment={waveMessage}
          onHomeClick={backToPlay}
          beamActive={beamFiring}
        />
        <TimeAttackOniScore
          layout="split"
          score={runningScore}
          pointsEarned={pendingPoints}
          flyLabel={pendingFlyLabel}
          flyDelayMs={SCORE_FLY_DELAY_MS}
          flyDurationMs={SCORE_FLY_DURATION_MS}
          animId={scoreAnimId}
          getFlyFromElement={() => pointsEarnedRef.current}
          onPointsApplied={() => setPendingPoints(null)}
          hpHit={hpHit}
          meta={
            <p className="time-attack-top__meta">
              問題 {timeAttackState.waveQuestionIndex + 1} / {questions.length}
              <span className="time-attack-top__meta-sep" aria-hidden="true">
                {" "}
              </span>
              ミス {timeAttackState.mistakeCount}/{MAX_MISTAKES}
            </p>
          }
        />
        <TimeAttackScoreBar
          className="time-attack-top__attack"
          state={timeAttackState}
          previewWaveScore={previewWaveScore}
        />
        <TimeAttackArena
          className="time-attack-arena--inline time-attack-top__hp"
          state={arenaState}
          displayHp={displayHp}
          hpMax={displayHpMax}
          hpHit={hpHit}
        />
      </div>

      <div className="relative z-20">
        {!TIME_ATTACK_COUNTDOWN_DISABLED && (
          <QuestionTimer
            key={questionKey}
            timeLimitSeconds={timeAttackState.timeLimitSeconds}
            questionKey={questionKey}
            onTimeout={() => void handleTimeout()}
            paused={timerPaused || submitting}
          />
        )}
      </div>

      {question && (
        <section
          className={`card relative z-20 text-center transition-transform ${feedbackType === "success" ? "animate-success" : feedbackType === "wrong" ? "animate-retry" : ""}`}
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

      <div className="relative z-20">
        <Keypad
          value={answer}
          onChange={setAnswer}
          onSubmit={() => void submitAnswer()}
          disabled={submitting || timerPaused}
          maxDigits={getMaxAnswerDigits(timeAttackState.currentLevel)}
        />
      </div>

      {error && <p className="feedback-error">{error}</p>}
    </div>
  );
}
