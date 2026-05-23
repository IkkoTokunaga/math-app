"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  submitTimeAttackAnswerAction,
} from "@/app/actions/time-attack";
import { GaugeLightCharge } from "@/components/GaugeLightCharge";
import { Keypad } from "@/components/Keypad";
import { MascotLightOrb, type OniPhase } from "@/components/MascotLightOrb";
import { OniEvilOrb } from "@/components/OniEvilOrb";
import { QuizMascot } from "@/components/QuizMascot";
import { TimeAttackArena } from "@/components/TimeAttackArena";
import { TimeAttackOniScore } from "@/components/TimeAttackOniScore";
import { TimeAttackScoreBar } from "@/components/TimeAttackScoreBar";
import type { AuthState } from "@/lib/auth/state";
import type { Question } from "@/lib/db/schema";
import { getWaveMaxScoreForState, type TimeAttackState } from "@/lib/time-attack";
import { MAX_MISTAKES } from "@/lib/time-attack-scoring";
import {
  formatQuestionExpression,
  getMaxAnswerDigits,
} from "@/lib/questions";
import { useIsClient } from "@/lib/use-is-client";
import { useQuizPanelFit } from "@/lib/use-quiz-panel-fit";

type InitialSession = {
  sessionId: string;
  questions: Question[];
  timeAttackState: TimeAttackState;
};

type TimeAttackClientProps = {
  auth: AuthState;
  initialSession: InitialSession;
};

const CORRECT_POPUP_MS = 1000;
const HEART_LOSS_PAUSE_MS = 220;
const DARK_FADE_MS = 950;
const GAUGE_DRAIN_MS = 580;
const GAUGE_REFLECT_PAUSE_MS = 240;
const ONI_SHAKE_MS = 520;
const ONI_EXPLODE_MS = 680;
const ONI_FINAL_CLEAR_EXPLODE_MS = 1400;
const ONI_ENTER_MS = 500;
const ONI_SETTLE_MS = 200;
const DEFEAT_MSG_MS = 1100;
const FINAL_CLEAR_POPUP_MS = 2200;

type WrongAnswerResult = {
  sessionEnded?: boolean;
  waveComplete?: boolean;
  cleared?: boolean;
  bossDefeated?: boolean;
  defeatBonus?: number;
  waveScore?: number;
  mistakeCount?: number;
  timeAttackState?: TimeAttackState;
  questions?: Question[];
};

type PendingAdvance = {
  sessionId: string;
  result: {
    waveComplete?: boolean;
    waveScore?: number;
    bossDefeated?: boolean;
    defeatBonus?: number;
    cleared?: boolean;
    sessionEnded?: boolean;
    timeAttackState?: TimeAttackState;
    questions?: Question[];
  };
};

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
  const [feedbackType, setFeedbackType] = useState<"success" | "wrong" | "defeat" | null>(null);
  const [alertType, setAlertType] = useState<"yellow" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runningScore, setRunningScore] = useState(initialSession.timeAttackState.totalScore);
  const [gaugeDisplayScore, setGaugeDisplayScore] = useState(
    initialSession.timeAttackState.waveScoreAccumulated,
  );
  const [gaugeLightAnimId, setGaugeLightAnimId] = useState(0);
  const [mascotLightAnimId, setMascotLightAnimId] = useState(0);
  const [gaugeLightFillRatio, setGaugeLightFillRatio] = useState(0);
  const [gaugeCharging, setGaugeCharging] = useState(false);
  const [gaugeDraining, setGaugeDraining] = useState(false);
  const [mascotCharging, setMascotCharging] = useState(false);
  const [lightOrbAnimId, setLightOrbAnimId] = useState(0);
  const [lightOrbFiring, setLightOrbFiring] = useState(false);
  const [previewWaveScore, setPreviewWaveScore] = useState<number | null>(null);
  const [timerPaused, setTimerPaused] = useState(false);
  const [waveMessage, setWaveMessage] = useState<string | null>(null);
  const [oniPhase, setOniPhase] = useState<OniPhase>("idle");
  const [awaitingNextOni, setAwaitingNextOni] = useState(false);
  const [displayMistakeCount, setDisplayMistakeCount] = useState(
    initialSession.timeAttackState.mistakeCount,
  );
  const [evilOrbAnimId, setEvilOrbAnimId] = useState(0);
  const [mascotHit, setMascotHit] = useState(false);
  const [screenDarkening, setScreenDarkening] = useState(false);
  const [defeatLoading, setDefeatLoading] = useState(false);

  const questionStartedAtRef = useRef<number>(0);
  const submitLockRef = useRef(false);
  const quizPanelRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLButtonElement>(null);
  const oniRef = useRef<HTMLDivElement>(null);
  const feedbackPopupRef = useRef<HTMLDivElement>(null);
  const attackGaugeRef = useRef<HTMLDivElement>(null);
  const pendingGaugeTargetRef = useRef<number | null>(null);
  const pendingTotalScoreRef = useRef<number | null>(null);
  const pendingAdvanceRef = useRef<PendingAdvance | null>(null);
  const pendingQuestionStateRef = useRef<TimeAttackState | null>(null);
  const correctPopupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mascotLightDoneRef = useRef<(() => void) | null>(null);
  const evilOrbDoneRef = useRef<(() => void) | null>(null);
  const lightOrbDoneRef = useRef<(() => void) | null>(null);
  const pendingWrongResultRef = useRef<WrongAnswerResult | null>(null);
  const oniEnterDoneRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    questionStartedAtRef.current = Date.now();
    document.documentElement.classList.add("quiz-active");
    document.body.classList.add("quiz-active");
    return () => {
      document.documentElement.classList.remove("quiz-active");
      document.body.classList.remove("quiz-active");
      if (correctPopupTimerRef.current != null) {
        clearTimeout(correctPopupTimerRef.current);
      }
    };
  }, []);

  useQuizPanelFit(quizPanelRef, isClient && Boolean(sessionId));

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

  const showDefeatPopup = (message: string) => {
    if (correctPopupTimerRef.current != null) {
      clearTimeout(correctPopupTimerRef.current);
      correctPopupTimerRef.current = null;
    }
    setDefeatLoading(false);
    setFeedback(message);
    setFeedbackType("defeat");
    setAlertType(null);
  };

  const markDefeatLoading = (result: {
    waveComplete?: boolean;
    bossDefeated?: boolean;
  }) => {
    if (result.waveComplete && result.bossDefeated) {
      setDefeatLoading(true);
    }
  };

  const clearFeedbackPopup = () => {
    setFeedback(null);
    setFeedbackType(null);
  };

  const waitForOniEnterComplete = () =>
    new Promise<void>((resolve) => {
      oniEnterDoneRef.current = resolve;
    });

  const handleOniEnterAnimationComplete = () => {
    oniEnterDoneRef.current?.();
    oniEnterDoneRef.current = null;
  };

  const applyWaveAdvanceState = (state: TimeAttackState, nextQuestions?: Question[]) => {
    pendingQuestionStateRef.current = null;
    setTimeAttackState(state);
    setDisplayMistakeCount(state.mistakeCount);
    if (nextQuestions) {
      setQuestions(nextQuestions);
    }
    setRunningScore(state.totalScore);
    setGaugeDisplayScore(state.waveScoreAccumulated);
    setPreviewWaveScore(null);
  };

  const unlockQuestionInput = () => {
    setAnswer("");
    questionStartedAtRef.current = Date.now();
    setTimerPaused(false);
    submitLockRef.current = false;
    setSubmitting(false);
  };

  const advanceAfterWavePopup = (result: PendingAdvance["result"]) => {
    if (result.bossDefeated || !result.timeAttackState) {
      return;
    }
    applyWaveAdvanceState(result.timeAttackState, result.questions);
    syncBossDisplay(result.timeAttackState);
    unlockQuestionInput();
  };

  const beginWaveAttack = async (
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
    const reflectedWaveScore =
      waveScore > 0 ? waveScore : result.timeAttackState.waveScoreAccumulated;
    const isBossDefeat = Boolean(result.bossDefeated);

    if (isBossDefeat) {
      setDefeatLoading(true);
      setTimerPaused(true);
      clearFeedbackPopup();
    }

    pendingGaugeTargetRef.current = null;

    setGaugeDisplayScore(reflectedWaveScore);
    if (pendingTotalScoreRef.current != null) {
      setRunningScore(pendingTotalScoreRef.current);
      pendingTotalScoreRef.current = null;
    }

    await new Promise((resolve) => setTimeout(resolve, motionMs(GAUGE_REFLECT_PAUSE_MS, 80)));

    setGaugeDraining(true);
    setMascotCharging(true);
    setGaugeDisplayScore(0);

    const mascotLightPromise = new Promise<void>((resolve) => {
      mascotLightDoneRef.current = resolve;
      setMascotLightAnimId((current) => current + 1);
    });

    await Promise.all([
      new Promise((resolve) => setTimeout(resolve, motionMs(GAUGE_DRAIN_MS, 220))),
      mascotLightPromise,
    ]);
    setGaugeDraining(false);

    await playLightOrbAttack();

    setOniPhase("shaking");
    setHpHit(true);
    setDisplayHp(hpAfter);

    await new Promise((resolve) => setTimeout(resolve, motionMs(ONI_SHAKE_MS, 320)));
    setHpHit(false);

    if (result.bossDefeated) {
      const isFinalClear = Boolean(result.cleared);
      showDefeatPopup(isFinalClear ? "鬼、すべて撃破！" : "鬼撃破！");

      setOniPhase("exploding");
      await new Promise((resolve) =>
        setTimeout(resolve, motionMs(isFinalClear ? ONI_FINAL_CLEAR_EXPLODE_MS : ONI_EXPLODE_MS, isFinalClear ? 700 : 350)),
      );
      setOniPhase("hidden");

      if (result.sessionEnded) {
        await new Promise((resolve) =>
          setTimeout(resolve, motionMs(isFinalClear ? FINAL_CLEAR_POPUP_MS : DEFEAT_MSG_MS, isFinalClear ? 900 : 400)),
        );
        clearFeedbackPopup();
        redirectToResult(id);
        return;
      }

      setAwaitingNextOni(true);

      await new Promise((resolve) => setTimeout(resolve, motionMs(80, 40)));
      syncBossDisplay(result.timeAttackState);
      setOniPhase("entering");
      await Promise.race([
        waitForOniEnterComplete(),
        new Promise((resolve) => setTimeout(resolve, motionMs(ONI_ENTER_MS + 80, 320))),
      ]);
      oniEnterDoneRef.current = null;
      setOniPhase("idle");
      await new Promise((resolve) => setTimeout(resolve, motionMs(ONI_SETTLE_MS, 80)));
      setAwaitingNextOni(false);

      applyWaveAdvanceState(result.timeAttackState, result.questions);

      clearFeedbackPopup();
      setWaveMessage(`ボス撃破！ +${result.defeatBonus ?? 0}点ボーナス`);
      await new Promise((resolve) => setTimeout(resolve, motionMs(DEFEAT_MSG_MS, 400)));
      setWaveMessage(null);

      unlockQuestionInput();
      return;
    }

    setOniPhase("idle");
    syncBossDisplay(result.timeAttackState);
  };

  const handleGaugeReach = () => {
    if (pendingGaugeTargetRef.current != null) {
      setGaugeDisplayScore(pendingGaugeTargetRef.current);
      pendingGaugeTargetRef.current = null;
    }
    if (pendingTotalScoreRef.current != null) {
      setRunningScore(pendingTotalScoreRef.current);
      pendingTotalScoreRef.current = null;
    }

    setGaugeCharging(true);
    setTimeout(() => setGaugeCharging(false), motionMs(450, 180));

    const advance = pendingAdvanceRef.current;
    if (advance) {
      pendingAdvanceRef.current = null;
      void beginWaveAttack(advance.sessionId, advance.result);
    }
  };

  const handleMascotLightReach = () => {
    setMascotCharging(false);
    mascotLightDoneRef.current?.();
    mascotLightDoneRef.current = null;
  };

  const handleMascotLightComplete = () => {};

  const handleGaugeChargeComplete = () => {};

  const getMistakeCountFromResult = (result: WrongAnswerResult) =>
    result.timeAttackState?.mistakeCount ?? result.mistakeCount ?? displayMistakeCount;

  const playEvilOrbAttack = () =>
    new Promise<void>((resolve) => {
      evilOrbDoneRef.current = resolve;
      setEvilOrbAnimId((current) => current + 1);
    });

  const playLightOrbAttack = () =>
    new Promise<void>((resolve) => {
      lightOrbDoneRef.current = resolve;
      setLightOrbFiring(true);
      setLightOrbAnimId((current) => current + 1);
    });

  const handleEvilOrbHit = () => {
    const result = pendingWrongResultRef.current;
    if (!result) {
      return;
    }
    setFeedback(null);
    setFeedbackType(null);
    setAlertType(null);
    setDisplayMistakeCount(getMistakeCountFromResult(result));
    setMascotHit(true);
    setTimeout(() => setMascotHit(false), motionMs(480, 180));
  };

  const handleEvilOrbComplete = () => {
    evilOrbDoneRef.current?.();
    evilOrbDoneRef.current = null;
  };

  const handleLightOrbComplete = () => {
    setLightOrbFiring(false);
    lightOrbDoneRef.current?.();
    lightOrbDoneRef.current = null;
  };

  const finishWrongAnswerSequence = async (result: WrongAnswerResult) => {
    pendingWrongResultRef.current = null;

    if (result.sessionEnded) {
      setScreenDarkening(true);
      await new Promise((resolve) => setTimeout(resolve, motionMs(DARK_FADE_MS, 400)));
      redirectToResult(sessionId);
      return;
    }

    if (result.waveComplete) {
      markDefeatLoading(result);
      advanceAfterWavePopup(result);
      void beginWaveAttack(sessionId, result);
      return;
    }

    applyPendingQuestionState();
    setAnswer("");
    questionStartedAtRef.current = Date.now();
    setTimerPaused(false);
    submitLockRef.current = false;
    setSubmitting(false);
  };

  const handleWrongAnswer = async (result: WrongAnswerResult) => {
    pendingWrongResultRef.current = result;
    if (result.timeAttackState) {
      pendingQuestionStateRef.current = result.timeAttackState;
    }

    setFeedback("不正解…");
    setFeedbackType("wrong");
    setAlertType("yellow");

    await playEvilOrbAttack();
    await new Promise((resolve) => setTimeout(resolve, motionMs(HEART_LOSS_PAUSE_MS, 80)));

    await finishWrongAnswerSequence(result);
  };

  const applyPendingQuestionState = () => {
    const pending = pendingQuestionStateRef.current;
    if (pending) {
      pendingQuestionStateRef.current = null;
      setTimeAttackState(pending);
      setDisplayMistakeCount(pending.mistakeCount);
    }
  };

  const dismissCorrectPopup = (waveComplete: boolean) => {
    setFeedback(null);
    setFeedbackType(null);

    if (waveComplete) {
      const advance = pendingAdvanceRef.current;
      if (advance) {
        advanceAfterWavePopup(advance.result);
      }
      return;
    }

    applyPendingQuestionState();
    unlockQuestionInput();
  };

  const scheduleCorrectPopupDismiss = (waveComplete: boolean) => {
    if (correctPopupTimerRef.current != null) {
      clearTimeout(correctPopupTimerRef.current);
    }
    correctPopupTimerRef.current = setTimeout(() => {
      correctPopupTimerRef.current = null;
      dismissCorrectPopup(waveComplete);
    }, motionMs(CORRECT_POPUP_MS, 350));
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

      if (result.correct) {
        const waveComplete = "waveComplete" in result && result.waveComplete;

        setFeedback("正解！");
        setFeedbackType("success");

        if (result.timeAttackState) {
          pendingGaugeTargetRef.current = result.timeAttackState.waveScoreAccumulated;
          pendingTotalScoreRef.current = result.timeAttackState.totalScore;
          const maxScore = getWaveMaxScoreForState(result.timeAttackState);
          setGaugeLightFillRatio(
            maxScore > 0 ? result.timeAttackState.waveScoreAccumulated / maxScore : 0,
          );
          if (!waveComplete) {
            pendingQuestionStateRef.current = result.timeAttackState;
          }
        }

        if (waveComplete) {
          pendingAdvanceRef.current = { sessionId, result };
          markDefeatLoading(result);
        } else {
          pendingAdvanceRef.current = null;
        }

        setGaugeLightAnimId((id) => id + 1);
        scheduleCorrectPopupDismiss(waveComplete);
        return;
      }

      await handleWrongAnswer(result);
      return;
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

  const question = awaitingNextOni
    ? null
    : questions[timeAttackState.waveQuestionIndex];

  return (
    <div ref={quizPanelRef} className="time-attack-client mx-auto flex w-full max-w-xl flex-col gap-3">
      <MascotLightOrb
        animId={lightOrbAnimId}
        fromRef={mascotRef}
        toRef={oniRef}
        onComplete={handleLightOrbComplete}
      />

      {alertType === "yellow" && (
        <div className="time-attack-alert time-attack-alert--yellow" aria-hidden="true" />
      )}

      <div className="time-attack-top relative z-20">
        <QuizMascot
          ref={mascotRef}
          className="time-attack-top__mascot"
          comment={waveMessage}
          onHomeClick={backToPlay}
          chargeActive={mascotCharging}
          hitActive={mascotHit}
          lightOrbActive={lightOrbFiring}
        />
        <TimeAttackOniScore
          layout="split"
          score={runningScore}
          pointsEarned={null}
          flyLabel={null}
          animId={0}
          getFlyFromElement={() => null}
          onPointsApplied={() => {}}
          oniPhase={oniPhase}
          oniRef={oniRef}
          bossKey={`${arenaState.currentLevel}-${arenaState.enmaNumber}`}
          currentLevel={arenaState.currentLevel}
          onEnterAnimationComplete={handleOniEnterAnimationComplete}
          meta={
            awaitingNextOni ? null : (
              <p className="time-attack-top__meta">
                問題 {timeAttackState.waveQuestionIndex + 1} / {questions.length}
              </p>
            )
          }
        />
        <TimeAttackScoreBar
          ref={attackGaugeRef}
          className="time-attack-top__attack"
          state={timeAttackState}
          displayScore={gaugeDisplayScore}
          charging={gaugeCharging}
          draining={gaugeDraining}
          previewWaveScore={previewWaveScore}
          mistakeCount={displayMistakeCount}
          maxMistakes={MAX_MISTAKES}
        />
        <TimeAttackArena
          className="time-attack-arena--inline time-attack-top__hp"
          state={arenaState}
          displayHp={displayHp}
          hpMax={displayHpMax}
          hpHit={hpHit}
        />
      </div>

      <GaugeLightCharge
        animId={gaugeLightAnimId}
        fromRef={feedbackPopupRef}
        toRef={attackGaugeRef}
        fillRatio={gaugeLightFillRatio}
        onReachTarget={handleGaugeReach}
        onComplete={handleGaugeChargeComplete}
      />

      <GaugeLightCharge
        animId={mascotLightAnimId}
        fromRef={attackGaugeRef}
        toRef={mascotRef}
        mode="gaugeToMascot"
        attackStream
        onReachTarget={handleMascotLightReach}
        onComplete={handleMascotLightComplete}
      />

      <OniEvilOrb
        animId={evilOrbAnimId}
        fromRef={oniRef}
        toRef={mascotRef}
        onHit={handleEvilOrbHit}
        onComplete={handleEvilOrbComplete}
      />

      {screenDarkening && <div className="time-attack-dark-overlay" aria-hidden="true" />}

      {defeatLoading && (
        <div className="time-attack-defeat-loading" role="status" aria-live="polite">
          <span className="time-attack-defeat-loading__spinner" aria-hidden="true" />
          <p className="time-attack-defeat-loading__label">読み込み中...</p>
        </div>
      )}

      {question && (
        <section
          className={`time-attack-board card relative z-20 text-center transition-transform ${feedbackType === "success" ? "animate-success" : feedbackType === "wrong" ? "animate-retry" : ""}`}
        >
          <div className="chalk-heading equation-display flex flex-nowrap items-center justify-center text-[clamp(1.25rem,6vw,3.75rem)] font-bold">
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
            ref={feedbackPopupRef}
            className={`feedback-popup ${
              feedbackType === "success"
                ? "feedback-popup-success"
                : feedbackType === "defeat"
                  ? "feedback-popup-attack"
                  : "feedback-popup-retry"
            }`}
          >
            <p
              className={
                feedbackType === "success"
                  ? "feedback-success"
                  : feedbackType === "defeat"
                    ? "feedback-attack"
                    : "feedback-retry"
              }
            >
              {feedback}
            </p>
          </div>
        </div>
      )}

      {!awaitingNextOni && (
        <div className="time-attack-keypad relative z-20">
          <Keypad
            value={answer}
            onChange={setAnswer}
            onSubmit={() => void submitAnswer()}
            disabled={submitting || timerPaused}
            maxDigits={getMaxAnswerDigits(timeAttackState.currentLevel)}
          />
        </div>
      )}

      {error && <p className="feedback-error">{error}</p>}
    </div>
  );
}
