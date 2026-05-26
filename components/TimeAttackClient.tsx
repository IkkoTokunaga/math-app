"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  submitTimeAttackAnswerAction,
} from "@/app/actions/time-attack";
import { GaugeLightCharge, ATTACK_GATHER_MS, ATTACK_CLUSTER_HOLD_MS, ATTACK_FLY_MS } from "@/components/GaugeLightCharge";
import { Keypad } from "@/components/Keypad";
import { MascotLightOrb, LIGHT_ORB_FLY_MS, type OniPhase } from "@/components/MascotLightOrb";
import { OniEvilOrb } from "@/components/OniEvilOrb";
import { QuizMascot } from "@/components/QuizMascot";
import { TimeAttackArena } from "@/components/TimeAttackArena";
import { SCORE_FLY_DELAY_MS, SCORE_FLY_DURATION_MS } from "@/components/RunningScore";
import { TimeAttackOniScore } from "@/components/TimeAttackOniScore";
import { TimeAttackScoreBar } from "@/components/TimeAttackScoreBar";
import type { HeartRecoveryAnim } from "@/components/TimeAttackLives";
import type { AuthState } from "@/lib/auth/state";
import type { Question } from "@/lib/db/schema";
import { getWaveMaxScoreForState, isEnmaBoss, type TimeAttackState } from "@/lib/time-attack";
import { MAX_MISTAKES } from "@/lib/time-attack-scoring";
import {
  formatExpression,
  DEFAULT_OPERATION,
  getCorrectAnswerForOperation,
  type Operation,
} from "@/lib/operations";
import { getSubtractionTimeAttackMaxAnswerDigits } from "@/lib/subtraction-time-attack-questions";
import { getTimeAttackMaxAnswerDigits } from "@/lib/time-attack-questions";
import { useIsClient } from "@/lib/use-is-client";
import { useQuizPanelFit } from "@/lib/use-quiz-panel-fit";
import {
  endTimeAttackBgmSession,
  useTimeAttackBgm,
} from "@/lib/use-time-attack-bgm";
import {
  playTimeAttackBeamSound,
  playTimeAttackGaugeChargeSound,
  playTimeAttackOniAttackSound,
  playTimeAttackOniRoarSound,
} from "@/lib/time-attack-sounds";
import { playQuizCorrectSound } from "@/lib/quiz-sounds";
import { getCountUpDurationMs } from "@/lib/use-animated-score";

type InitialSession = {
  sessionId: string;
  questions: Question[];
  timeAttackState: TimeAttackState;
};

type TimeAttackClientProps = {
  auth: AuthState;
  initialSession: InitialSession;
  operation?: Operation;
};

function getMaxAnswerDigits(operation: Operation, level: TimeAttackState["currentLevel"]): number {
  return operation === "subtraction"
    ? getSubtractionTimeAttackMaxAnswerDigits(level)
    : getTimeAttackMaxAnswerDigits(level);
}

const CORRECT_POPUP_MS = 1000;
const HEART_LOSS_PAUSE_MS = 220;
const HEART_RECOVER_EXPAND_MS = 320;
const HEART_RECOVER_FILL_MS = 360;
const DARK_FADE_MS = 950;
const GAUGE_DRAIN_MS = 580;
/** Matches `.time-attack-gauge__fill--attack` width transition in globals.css */
const GAUGE_FILL_RISE_MS = 550;
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
  waveMaxScore: number;
  hpAfter: number;
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

type QueuedWaveAttack = {
  sessionId: string;
  waveScore: number;
  waveMaxScore: number;
  hpAfter: number;
  awaitGaugeFill?: boolean;
  result: PendingAdvance["result"];
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function motionMs(full: number, reduced: number): number {
  return prefersReducedMotion() ? reduced : full;
}

const MASCOT_LIGHT_MS = ATTACK_GATHER_MS + ATTACK_CLUSTER_HOLD_MS + ATTACK_FLY_MS;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitWithMotionFallback(promise: Promise<void>, timeoutMs: number): Promise<void> {
  return Promise.race([promise, delay(motionMs(timeoutMs, Math.round(timeoutMs * 0.4)))]);
}

/** 5問目完了時は timeAttackState.waveScoreAccumulated が既に 0 になっているため waveScore を使う */
function getGaugeWaveScore(result: {
  waveComplete?: boolean;
  waveScore?: number;
  timeAttackState?: TimeAttackState;
}): number {
  if (result.waveComplete && result.waveScore != null) {
    return result.waveScore;
  }
  return result.timeAttackState?.waveScoreAccumulated ?? 0;
}

export function TimeAttackClient({
  initialSession,
  operation = DEFAULT_OPERATION,
}: TimeAttackClientProps) {
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
  const [attackDrain, setAttackDrain] = useState<{
    score: number;
    maxScore: number;
    draining: boolean;
  } | null>(null);
  const [timerPaused, setTimerPaused] = useState(false);
  const [waveMessage, setWaveMessage] = useState<string | null>(null);
  const [oniPhase, setOniPhase] = useState<OniPhase>("idle");
  const [awaitingNextOni, setAwaitingNextOni] = useState(false);
  const [displayMistakeCount, setDisplayMistakeCount] = useState(
    initialSession.timeAttackState.mistakeCount,
  );
  const [heartRecovery, setHeartRecovery] = useState<HeartRecoveryAnim | null>(null);
  const [evilOrbAnimId, setEvilOrbAnimId] = useState(0);
  const [mascotHit, setMascotHit] = useState(false);
  const [screenDarkening, setScreenDarkening] = useState(false);
  const [defeatLoading, setDefeatLoading] = useState(false);
  const [pendingDefeatBonusPoints, setPendingDefeatBonusPoints] = useState<number | null>(null);
  const [defeatBonusFlyLabel, setDefeatBonusFlyLabel] = useState<string | null>(null);
  const [defeatBonusAnimId, setDefeatBonusAnimId] = useState(0);

  const questionStartedAtRef = useRef<number>(0);
  const submitLockRef = useRef(false);
  const quizPanelRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLButtonElement>(null);
  const oniRef = useRef<HTMLDivElement>(null);
  const feedbackPopupRef = useRef<HTMLDivElement>(null);
  const defeatBonusRef = useRef<HTMLParagraphElement>(null);
  const attackGaugeRef = useRef<HTMLDivElement>(null);
  const pendingGaugeTargetRef = useRef<number | null>(null);
  const pendingTotalScoreRef = useRef<number | null>(null);
  const pendingDefeatBonusAmountRef = useRef(0);
  const defeatBonusFlyDoneRef = useRef<(() => void) | null>(null);
  const pendingAdvanceRef = useRef<PendingAdvance | null>(null);
  const pendingQuestionStateRef = useRef<TimeAttackState | null>(null);
  const correctPopupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mascotLightDoneRef = useRef<(() => void) | null>(null);
  const evilOrbDoneRef = useRef<(() => void) | null>(null);
  const lightOrbDoneRef = useRef<(() => void) | null>(null);
  const pendingWrongResultRef = useRef<WrongAnswerResult | null>(null);
  const oniEnterDoneRef = useRef<(() => void) | null>(null);
  const attackQueueRef = useRef<QueuedWaveAttack[]>([]);
  const processingAttackRef = useRef(false);

  useEffect(() => {
    questionStartedAtRef.current = Date.now();
    document.documentElement.classList.add("quiz-active");
    document.body.classList.add("quiz-active");
    if (!isEnmaBoss(initialSession.timeAttackState.currentLevel)) {
      playTimeAttackOniRoarSound();
    }
    return () => {
      document.documentElement.classList.remove("quiz-active");
      document.body.classList.remove("quiz-active");
      if (correctPopupTimerRef.current != null) {
        clearTimeout(correctPopupTimerRef.current);
      }
    };
  }, [initialSession.timeAttackState.currentLevel]);

  useQuizPanelFit(quizPanelRef, isClient && Boolean(sessionId));

  const getElapsedSeconds = () => (Date.now() - questionStartedAtRef.current) / 1000;

  const redirectToResult = useCallback(
    (id: string) => {
      endTimeAttackBgmSession(sessionId);
      router.push(`/result/time-attack/${id}`);
    },
    [router, sessionId],
  );

  useTimeAttackBgm(sessionId, arenaState);

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

  const applyWaveAdvanceState = (
    state: TimeAttackState,
    nextQuestions?: Question[],
    options?: { preserveGaugeDisplay?: boolean; skipScoreUpdate?: boolean },
  ) => {
    pendingQuestionStateRef.current = null;
    setTimeAttackState(state);
    setDisplayMistakeCount(state.mistakeCount);
    if (nextQuestions) {
      setQuestions(nextQuestions);
    }
    if (!options?.skipScoreUpdate) {
      setRunningScore(state.totalScore);
    }
    if (!options?.preserveGaugeDisplay) {
      setGaugeDisplayScore(state.waveScoreAccumulated);
    }
  };

  const applyPendingTotalScore = (result?: PendingAdvance["result"]) => {
    if (pendingTotalScoreRef.current == null) {
      return;
    }

    const total = pendingTotalScoreRef.current;
    pendingTotalScoreRef.current = null;
    const defeatBonus =
      result?.bossDefeated && (result.defeatBonus ?? 0) > 0 ? result.defeatBonus! : 0;
    setRunningScore(total - defeatBonus);
  };

  const applyDefeatBonus = useCallback(() => {
    setRunningScore((score) => score + pendingDefeatBonusAmountRef.current);
    setPendingDefeatBonusPoints(null);
    setDefeatBonusFlyLabel(null);
    pendingDefeatBonusAmountRef.current = 0;
    defeatBonusFlyDoneRef.current?.();
    defeatBonusFlyDoneRef.current = null;
  }, []);

  const playDefeatBonusAward = useCallback(async (defeatBonus: number) => {
    if (defeatBonus <= 0) {
      return;
    }

    setWaveMessage(`ボス撃破！ +${defeatBonus}点ボーナス`);

    if (prefersReducedMotion()) {
      setRunningScore((score) => score + defeatBonus);
      await delay(motionMs(DEFEAT_MSG_MS, 400));
      setWaveMessage(null);
      return;
    }

    pendingDefeatBonusAmountRef.current = defeatBonus;
    setDefeatBonusFlyLabel(`+${defeatBonus}点ボーナス`);
    setPendingDefeatBonusPoints(defeatBonus);

    await new Promise<void>((resolve) => {
      defeatBonusFlyDoneRef.current = resolve;
      requestAnimationFrame(() => {
        setDefeatBonusAnimId((id) => id + 1);
      });
    });

    await delay(getCountUpDurationMs(defeatBonus));
    await delay(motionMs(DEFEAT_MSG_MS, 400));
    setWaveMessage(null);
  }, []);

  const playHeartRecovery = async (prevMistakeCount: number, nextMistakeCount: number) => {
    if (nextMistakeCount >= prevMistakeCount) {
      return;
    }

    const heartIndex = MAX_MISTAKES - prevMistakeCount;
    setHeartRecovery({ index: heartIndex, phase: "expand" });
    await new Promise((resolve) =>
      setTimeout(resolve, motionMs(HEART_RECOVER_EXPAND_MS, 120)),
    );

    setHeartRecovery({ index: heartIndex, phase: "fill" });
    setDisplayMistakeCount(nextMistakeCount);
    await new Promise((resolve) => setTimeout(resolve, motionMs(HEART_RECOVER_FILL_MS, 120)));

    setHeartRecovery(null);
  };

  const unlockQuestionInput = () => {
    setAnswer("");
    questionStartedAtRef.current = Date.now();
    setTimerPaused(false);
    submitLockRef.current = false;
    setSubmitting(false);
  };

  const playBackgroundWaveAttack = async (attack: QueuedWaveAttack) => {
    const { waveScore, waveMaxScore, hpAfter } = attack;

    const pauseBeforeDrain =
      (attack.awaitGaugeFill ?? false)
        ? motionMs(GAUGE_FILL_RISE_MS + GAUGE_REFLECT_PAUSE_MS, 300)
        : motionMs(GAUGE_REFLECT_PAUSE_MS, 80);
    await delay(pauseBeforeDrain);

    setGaugeDisplayScore(0);
    setGaugeDraining(true);
    setMascotCharging(true);
    setAttackDrain({ score: waveScore, maxScore: waveMaxScore, draining: true });
    await delay(16);
    setAttackDrain({ score: 0, maxScore: waveMaxScore, draining: true });
    playTimeAttackGaugeChargeSound();

    const mascotLightPromise = new Promise<void>((resolve) => {
      mascotLightDoneRef.current = resolve;
      setMascotLightAnimId((current) => current + 1);
    });

    await Promise.all([
      delay(motionMs(GAUGE_DRAIN_MS, 220)),
      waitWithMotionFallback(mascotLightPromise, MASCOT_LIGHT_MS),
    ]);
    setGaugeDraining(false);
    setMascotCharging(false);

    await waitWithMotionFallback(playLightOrbAttack(), LIGHT_ORB_FLY_MS + 80);

    setOniPhase("shaking");
    setHpHit(true);
    setDisplayHp(hpAfter);

    await delay(motionMs(ONI_SHAKE_MS, 320));
    setHpHit(false);
    setOniPhase("idle");
    setAttackDrain(null);
  };

  const playBossDefeatAttack = async (attack: QueuedWaveAttack) => {
    const { sessionId: id, waveScore, waveMaxScore, result } = attack;
    if (!result.timeAttackState) {
      return;
    }

    setDefeatLoading(true);
    setTimerPaused(true);
    clearFeedbackPopup();

    const pauseBeforeDrain =
      (attack.awaitGaugeFill ?? false)
        ? motionMs(GAUGE_FILL_RISE_MS + GAUGE_REFLECT_PAUSE_MS, 300)
        : motionMs(GAUGE_REFLECT_PAUSE_MS, 80);
    await delay(pauseBeforeDrain);

    setGaugeDraining(true);
    setMascotCharging(true);
    setAttackDrain({ score: waveScore, maxScore: waveMaxScore, draining: true });
    await delay(16);
    setAttackDrain({ score: 0, maxScore: waveMaxScore, draining: true });
    playTimeAttackGaugeChargeSound();

    const mascotLightPromise = new Promise<void>((resolve) => {
      mascotLightDoneRef.current = resolve;
      setMascotLightAnimId((current) => current + 1);
    });

    await Promise.all([
      delay(motionMs(GAUGE_DRAIN_MS, 220)),
      waitWithMotionFallback(mascotLightPromise, MASCOT_LIGHT_MS),
    ]);
    setGaugeDraining(false);

    await waitWithMotionFallback(playLightOrbAttack(), LIGHT_ORB_FLY_MS + 80);

    setOniPhase("shaking");
    setHpHit(true);
    setDisplayHp(0);

    await delay(motionMs(ONI_SHAKE_MS, 320));
    setHpHit(false);

    const isFinalClear = Boolean(result.cleared);
    showDefeatPopup(isFinalClear ? "鬼、すべて撃破！" : "鬼撃破！");

    setOniPhase("exploding");
    await delay(
      motionMs(
        isFinalClear ? ONI_FINAL_CLEAR_EXPLODE_MS : ONI_EXPLODE_MS,
        isFinalClear ? 700 : 350,
      ),
    );
    setOniPhase("hidden");

    if (!result.sessionEnded) {
      await playHeartRecovery(displayMistakeCount, result.timeAttackState.mistakeCount);
    }

    if (result.sessionEnded) {
      if (result.timeAttackState) {
        const defeatBonus = result.defeatBonus ?? 0;
        setRunningScore(result.timeAttackState.totalScore - defeatBonus);
      }
      await playDefeatBonusAward(result.defeatBonus ?? 0);
      await delay(
        motionMs(
          isFinalClear ? FINAL_CLEAR_POPUP_MS : DEFEAT_MSG_MS,
          isFinalClear ? 900 : 400,
        ),
      );
      clearFeedbackPopup();
      redirectToResult(id);
      return;
    }

    setAwaitingNextOni(true);

    await delay(motionMs(80, 40));
    syncBossDisplay(result.timeAttackState);
    if (!isEnmaBoss(result.timeAttackState.currentLevel)) {
      playTimeAttackOniRoarSound();
    }
    setOniPhase("entering");
    await Promise.race([
      waitForOniEnterComplete(),
      delay(motionMs(ONI_ENTER_MS + 80, 320)),
    ]);
    oniEnterDoneRef.current = null;
    setOniPhase("idle");
    await delay(motionMs(ONI_SETTLE_MS, 80));
    setAwaitingNextOni(false);

    applyWaveAdvanceState(result.timeAttackState, result.questions, { skipScoreUpdate: true });
    setAttackDrain(null);

    clearFeedbackPopup();
    if (result.timeAttackState) {
      const defeatBonus = result.defeatBonus ?? 0;
      setRunningScore(result.timeAttackState.totalScore - defeatBonus);
    }
    await playDefeatBonusAward(result.defeatBonus ?? 0);

    unlockQuestionInput();
  };

  const processAttackQueue = async () => {
    if (processingAttackRef.current) {
      return;
    }
    processingAttackRef.current = true;
    try {
      while (attackQueueRef.current.length > 0) {
        const attack = attackQueueRef.current.shift();
        if (!attack) {
          continue;
        }
        if (attack.result.bossDefeated) {
          await playBossDefeatAttack(attack);
        } else {
          await playBackgroundWaveAttack(attack);
        }
      }
    } finally {
      processingAttackRef.current = false;
    }
  };

  const enqueueWaveAttack = (attack: QueuedWaveAttack) => {
    attackQueueRef.current.push(attack);
    void processAttackQueue();
  };

  const handleGaugeReach = () => {
    const advance = pendingAdvanceRef.current;
    if (advance) {
      pendingAdvanceRef.current = null;
      applyPendingTotalScore(advance.result);
      const waveScore =
        pendingGaugeTargetRef.current ?? getGaugeWaveScore(advance.result);
      pendingGaugeTargetRef.current = null;

      setGaugeDisplayScore(waveScore);
      setGaugeCharging(true);
      setTimeout(() => setGaugeCharging(false), motionMs(450, 180));

      enqueueWaveAttack({
        sessionId: advance.sessionId,
        waveScore,
        waveMaxScore: advance.waveMaxScore,
        hpAfter: advance.hpAfter,
        awaitGaugeFill: true,
        result: advance.result,
      });
      return;
    }

    if (pendingGaugeTargetRef.current != null) {
      setGaugeDisplayScore(pendingGaugeTargetRef.current);
      pendingGaugeTargetRef.current = null;
    }
    applyPendingTotalScore();

    setGaugeCharging(true);
    setTimeout(() => setGaugeCharging(false), motionMs(450, 180));
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
      playTimeAttackOniAttackSound();
      setEvilOrbAnimId((current) => current + 1);
    });

  const playLightOrbAttack = () =>
    new Promise<void>((resolve) => {
      lightOrbDoneRef.current = resolve;
      setLightOrbFiring(true);
      playTimeAttackBeamSound();
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
      const waveScore = result.waveScore ?? 0;
      const waveMaxScore = getWaveMaxScoreForState(timeAttackState);
      const hpAfter = result.bossDefeated
        ? 0
        : (result.timeAttackState?.oniHpRemaining ?? displayHp);

      setGaugeDisplayScore(waveScore);
      if (!result.bossDefeated && result.timeAttackState) {
        applyWaveAdvanceState(result.timeAttackState, result.questions, {
          preserveGaugeDisplay: true,
        });
        unlockQuestionInput();
      }

      enqueueWaveAttack({
        sessionId,
        waveScore,
        waveMaxScore,
        hpAfter,
        awaitGaugeFill: true,
        result,
      });
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
      if (advance?.result.bossDefeated) {
        return;
      }
      if (advance?.result.timeAttackState) {
        applyWaveAdvanceState(advance.result.timeAttackState, advance.result.questions, {
          preserveGaugeDisplay: true,
        });
        unlockQuestionInput();
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
    const question = questions[timeAttackState.waveQuestionIndex];
    if (
      question &&
      numericAnswer === getCorrectAnswerForOperation(operation, question)
    ) {
      playQuizCorrectSound();
    }

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
          const gaugeWaveScore = getGaugeWaveScore(result);
          pendingGaugeTargetRef.current = gaugeWaveScore;
          pendingTotalScoreRef.current = result.timeAttackState.totalScore;
          const maxScore = getWaveMaxScoreForState(
            waveComplete ? timeAttackState : result.timeAttackState,
          );
          setGaugeLightFillRatio(maxScore > 0 ? gaugeWaveScore / maxScore : 0);
          if (!waveComplete) {
            pendingQuestionStateRef.current = result.timeAttackState;
          }
        }

        if (waveComplete) {
          const hpAfter = result.bossDefeated
            ? 0
            : (result.timeAttackState?.oniHpRemaining ?? displayHp);
          pendingAdvanceRef.current = {
            sessionId,
            waveMaxScore: getWaveMaxScoreForState(timeAttackState),
            hpAfter,
            result,
          };
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
    router.push(operation === "subtraction" ? "/play?operation=subtraction" : "/play");
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
          operation={operation}
          chargeActive={mascotCharging}
          hitActive={mascotHit}
          lightOrbActive={lightOrbFiring}
        />
        <TimeAttackOniScore
          layout="split"
          score={runningScore}
          pointsEarned={pendingDefeatBonusPoints}
          flyLabel={defeatBonusFlyLabel}
          flyClassName="score-fly-badge--streak"
          animId={defeatBonusAnimId}
          getFlyFromElement={() => defeatBonusRef.current}
          onPointsApplied={applyDefeatBonus}
          oniPhase={oniPhase}
          oniRef={oniRef}
          bossKey={`${arenaState.currentLevel}-${arenaState.enmaNumber}`}
          currentLevel={arenaState.currentLevel}
          operation={operation}
          onEnterAnimationComplete={handleOniEnterAnimationComplete}
        />
        <TimeAttackScoreBar
          ref={attackGaugeRef}
          className="time-attack-top__attack"
          state={timeAttackState}
          displayScore={gaugeDisplayScore}
          charging={gaugeCharging}
          draining={gaugeDraining}
          attackDrain={attackDrain}
          mistakeCount={displayMistakeCount}
          maxMistakes={MAX_MISTAKES}
          heartRecovery={heartRecovery}
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
              {formatExpression(operation, question)} =
            </span>
            <span className="answer-slot ml-2 shrink-0">{answer || "?"}</span>
          </div>
        </section>
      )}

      {defeatBonusFlyLabel && (
        <div
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-6"
          aria-hidden="true"
        >
          <p ref={defeatBonusRef} className="feedback-points-streak">
            {defeatBonusFlyLabel}
          </p>
        </div>
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
            maxDigits={getMaxAnswerDigits(operation, timeAttackState.currentLevel)}
          />
        </div>
      )}

      {error && <p className="feedback-error">{error}</p>}
    </div>
  );
}
