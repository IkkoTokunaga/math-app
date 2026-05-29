"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyTimeMagicHeartLossAction,
  submitTimeAttackAnswerAction,
} from "@/app/actions/time-attack";
import {
  applyGuestTimeMagicHeartLoss,
  startGuestTimeAttackSession,
  submitGuestTimeAttackAnswer,
} from "@/lib/guest-time-attack";
import { GaugeLightCharge, ATTACK_GATHER_MS, ATTACK_CLUSTER_HOLD_MS, ATTACK_FLY_MS } from "@/components/GaugeLightCharge";
import { Keypad } from "@/components/Keypad";
import { MascotLightOrb, LIGHT_ORB_FLY_MS, type OniPhase } from "@/components/MascotLightOrb";
import { OniEvilOrb } from "@/components/OniEvilOrb";
import { QuizMascot } from "@/components/QuizMascot";
import { TimeAttackArena } from "@/components/TimeAttackArena";
import { SCORE_FLY_DELAY_MS, SCORE_FLY_DURATION_MS } from "@/components/RunningScore";
import { TimeAttackOniScore } from "@/components/TimeAttackOniScore";
import { TimeAttackScoreBar } from "@/components/TimeAttackScoreBar";
import { SessionRecoveryLoading } from "@/components/SessionRecoveryLoading";
import type { HeartRecoveryAnim } from "@/components/TimeAttackLives";
import type { AuthState } from "@/lib/auth/state";
import type { Question } from "@/lib/db/schema";
import {
  getLv11IntroQuestionRevealMs,
  Lv11EntranceClockPhantom,
} from "@/components/Lv11EntranceClockPhantom";
import { TimeMagicCountdown } from "@/components/TimeMagicCountdown";
import {
  getTimeMagicSecondsRemainingFromGaugeElapsed,
  TIME_MAGIC_COUNTDOWN_SECONDS,
} from "@/lib/time-attack-magic";
import { getWaveMaxScoreForState, isEnmaBoss, isTimeMagicLevel, type TimeAttackState } from "@/lib/time-attack";
import { MAX_MISTAKES } from "@/lib/time-attack-scoring";
import {
  formatExpression,
  DEFAULT_OPERATION,
  getCorrectAnswerForOperation,
  type Operation,
  getMascotSrc,
} from "@/lib/operations";
import { getSubtractionTimeAttackMaxAnswerDigits } from "@/lib/subtraction-time-attack-questions";
import { getTimeAttackMaxAnswerDigits } from "@/lib/time-attack-questions";
import { useIsClient } from "@/lib/use-is-client";
import { useMobileStaleSessionRecovery } from "@/lib/use-mobile-stale-session-recovery";
import { isMobileViewport } from "@/lib/bgm-volume";
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
  initialSession?: InitialSession;
  operation?: Operation;
};

type TimeAttackClientInnerProps = {
  isGuest: boolean;
  initialSession: InitialSession;
  operation?: Operation;
};

function getMaxAnswerDigits(operation: Operation, level: TimeAttackState["currentLevel"]): number {
  return operation === "subtraction"
    ? getSubtractionTimeAttackMaxAnswerDigits(level)
    : getTimeAttackMaxAnswerDigits(level);
}

const CORRECT_POPUP_MS = 1000;
const TIME_ATTACK_CORRECT_POPUP_MS = 250;
const HEART_LOSS_PAUSE_MS = 220;
const POISON_HEART_PAUSE_MS = 480;
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
  auth,
  initialSession,
  operation = DEFAULT_OPERATION,
}: TimeAttackClientProps) {
  const isGuest = !auth.loggedIn;
  const isClient = useIsClient();
  const [guestSession, setGuestSession] = useState<InitialSession | null>(null);
  const [guestBootError, setGuestBootError] = useState<string | null>(null);

  useEffect(() => {
    if (!isGuest) {
      return;
    }

    try {
      const started = startGuestTimeAttackSession(operation, true);
      setGuestSession({
        sessionId: started.localId,
        questions: started.questions,
        timeAttackState: started.timeAttackState,
      });
    } catch (err) {
      setGuestBootError(
        err instanceof Error ? err.message : "タイムアタックの開始に失敗しました",
      );
    }
  }, [isGuest, operation]);

  if (!isClient) {
    return <p className="text-center text-lg text-muted">読み込み中...</p>;
  }

  if (guestBootError) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <p className="feedback-error">{guestBootError}</p>
        <Link
          href={operation === "subtraction" ? "/play?operation=subtraction" : "/play"}
          className="big-btn big-btn-secondary mt-4 inline-block"
        >
          モード選択へ
        </Link>
      </div>
    );
  }

  if (isGuest && !guestSession) {
    return <p className="text-center text-lg text-muted">読み込み中...</p>;
  }

  if (!isGuest && !initialSession) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <p className="feedback-error">セッションを開始できませんでした</p>
        <Link href="/play" className="big-btn big-btn-secondary mt-4 inline-block">
          モード選択へ
        </Link>
      </div>
    );
  }

  return (
    <TimeAttackClientInner
      isGuest={isGuest}
      initialSession={isGuest ? guestSession! : initialSession!}
      operation={operation}
    />
  );
}

function TimeAttackClientInner({
  isGuest,
  initialSession,
  operation = DEFAULT_OPERATION,
}: TimeAttackClientInnerProps) {
  const router = useRouter();
  const isClient = useIsClient();
  const sessionId = initialSession.sessionId;
  const playHomeHref =
    operation === "subtraction" ? "/play?operation=subtraction" : "/play";
  const { recoveringHome, handleSessionError, redirectHome } = useMobileStaleSessionRecovery({
    sessionId,
    homeHref: playHomeHref,
    isGuest,
    mode: "time_attack",
    operation,
    onBeforeRedirect: () => endTimeAttackBgmSession(sessionId),
  });
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
    initialSession.timeAttackState.specialGaugeCharge,
  );
  const [isSpecialMoveActive, setIsSpecialMoveActive] = useState(false);
  const [mascotSpecialActive, setMascotSpecialActive] = useState(false);
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
  const [mascotPoison, setMascotPoison] = useState(false);
  const [timeMagicSecondsLeft, setTimeMagicSecondsLeft] = useState<number | null>(null);
  const [timeMagicGaugeVisible, setTimeMagicGaugeVisible] = useState(false);
  const [lv11EntrancePhantomAnimId, setLv11EntrancePhantomAnimId] = useState(0);
  const [lv11EntrancePlaying, setLv11EntrancePlaying] = useState(false);
  const [lv11QuestionRevealed, setLv11QuestionRevealed] = useState(true);
  const [screenDarkening, setScreenDarkening] = useState(false);
  const [defeatLoading, setDefeatLoading] = useState(false);
  const [pendingDefeatBonusPoints, setPendingDefeatBonusPoints] = useState<number | null>(null);
  const [defeatBonusFlyLabel, setDefeatBonusFlyLabel] = useState<string | null>(null);
  const [defeatBonusAnimId, setDefeatBonusAnimId] = useState(0);

  const questionStartedAtRef = useRef<number>(0);
  const submitLockRef = useRef(false);
  const quizPanelRef = useRef<HTMLDivElement>(null);
  const timeMagicTimerAnchorRef = useRef<HTMLDivElement>(null);
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
  const timeMagicPenaltyLockRef = useRef(false);
  const timeMagicGaugeStartedAtRef = useRef<number | null>(null);
  const lv11IntroRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lv11IntroRevealResolveRef = useRef<(() => void) | null>(null);
  const lv11PhantomLaunchRequestedRef = useRef(false);
  const lv11InitialPhantomStartedRef = useRef(false);

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

  const waveQuestion = questions[timeAttackState.waveQuestionIndex] ?? null;
  const activeQuestion =
    awaitingNextOni && !lv11EntrancePlaying ? null : waveQuestion;

  const showQuestionBoard =
    Boolean(activeQuestion) &&
    (!awaitingNextOni || lv11EntrancePlaying) &&
    (lv11QuestionRevealed || lv11EntrancePlaying);
  const showQuestionContent = lv11QuestionRevealed;

  const resetTimeMagicPenalty = useCallback(() => {
    timeMagicPenaltyLockRef.current = false;
    timeMagicGaugeStartedAtRef.current = null;
    setTimeMagicSecondsLeft(null);
    setTimeMagicGaugeVisible(false);
  }, []);

  const resetLv11EntranceIntro = useCallback(() => {
    setLv11EntrancePlaying(false);
    lv11PhantomLaunchRequestedRef.current = false;
    setLv11QuestionRevealed(true);
    if (lv11IntroRevealTimerRef.current != null) {
      clearTimeout(lv11IntroRevealTimerRef.current);
      lv11IntroRevealTimerRef.current = null;
    }
    lv11IntroRevealResolveRef.current?.();
    lv11IntroRevealResolveRef.current = null;
  }, []);

  const startLv11PenaltyCountdown = useCallback(() => {
    timeMagicGaugeStartedAtRef.current = Date.now();
    setTimeMagicGaugeVisible(true);
    setTimeMagicSecondsLeft(TIME_MAGIC_COUNTDOWN_SECONDS);
  }, []);

  const handleLv11EntranceClockComplete = useCallback(() => {
    startLv11PenaltyCountdown();
  }, [startLv11PenaltyCountdown]);

  const scheduleLv11QuestionReveal = useCallback(() => {
    if (lv11IntroRevealTimerRef.current != null) {
      clearTimeout(lv11IntroRevealTimerRef.current);
      lv11IntroRevealTimerRef.current = null;
    }

    lv11IntroRevealTimerRef.current = setTimeout(() => {
      lv11IntroRevealTimerRef.current = null;
      const resolve = lv11IntroRevealResolveRef.current;
      lv11IntroRevealResolveRef.current = null;
      setLv11QuestionRevealed(true);
      resolve?.();
    }, motionMs(getLv11IntroQuestionRevealMs(), 500));
  }, []);

  const beginLv11QuestionClockPhantom = useCallback(
    (options?: { revealQuestionDuringFlight?: boolean }) => {
      if (prefersReducedMotion()) {
        if (options?.revealQuestionDuringFlight) {
          setLv11QuestionRevealed(true);
        }
        startLv11PenaltyCountdown();
        return;
      }

      if (options?.revealQuestionDuringFlight) {
        scheduleLv11QuestionReveal();
      } else {
        setLv11QuestionRevealed(true);
      }

      lv11PhantomLaunchRequestedRef.current = true;
    },
    [scheduleLv11QuestionReveal, startLv11PenaltyCountdown],
  );

  const beginLv11EntranceAtBossEnter = useCallback(() => {
    beginLv11QuestionClockPhantom({ revealQuestionDuringFlight: true });
  }, [beginLv11QuestionClockPhantom]);

  const waitForLv11QuestionReveal = useCallback(async () => {
    if (prefersReducedMotion() || lv11QuestionRevealed) {
      return;
    }

    await new Promise<void>((resolve) => {
      lv11IntroRevealResolveRef.current = resolve;
    });
  }, [lv11QuestionRevealed]);

  const getDefeatBonusFlyFromElement = useCallback(() => defeatBonusRef.current, []);

  const redirectToResult = useCallback(
    (id: string) => {
      endTimeAttackBgmSession(sessionId);
      router.push(
        isGuest ? `/result/time-attack/guest/${id}` : `/result/time-attack/${id}`,
      );
    },
    [router, sessionId, isGuest],
  );

  const playPoisonHeartLoss = async () => {
    setMascotPoison(true);
    await new Promise((resolve) => setTimeout(resolve, motionMs(POISON_HEART_PAUSE_MS, 180)));
    setMascotPoison(false);
  };

  const applyTimeMagicPenalty = useCallback(
    async (gaugeElapsedSeconds: number) => {
      try {
        const result = isGuest
          ? applyGuestTimeMagicHeartLoss(sessionId, gaugeElapsedSeconds)
          : await applyTimeMagicHeartLossAction(sessionId, gaugeElapsedSeconds);
        if (!result.applied) {
          timeMagicPenaltyLockRef.current = false;
          return;
        }

        await playPoisonHeartLoss();
        setDisplayMistakeCount(result.mistakeCount);
        if (result.timeAttackState) {
          setTimeAttackState(result.timeAttackState);
          pendingQuestionStateRef.current = result.timeAttackState;
        }

        if (result.sessionEnded) {
          setScreenDarkening(true);
          await new Promise((resolve) => setTimeout(resolve, motionMs(DARK_FADE_MS, 400)));
          redirectToResult(sessionId);
        }
      } catch (err) {
        if (handleSessionError(err)) {
          return;
        }
        timeMagicPenaltyLockRef.current = false;
        setError(err instanceof Error ? err.message : "時間の魔法の処理に失敗しました");
      }
    },
    [redirectToResult, sessionId, isGuest, handleSessionError],
  );

  // 問題が進んだときだけペナルティゲージをリセット（登場イントロ状態は unlock で片付ける）
  useEffect(() => {
    resetTimeMagicPenalty();
  }, [timeAttackState.globalQuestionIndex, resetTimeMagicPenalty]);

  // 黒板 DOM が出たあとで時計幻影を飛ばす（マウント前だと即 onComplete になり何も見えない）
  useEffect(() => {
    if (!lv11PhantomLaunchRequestedRef.current || !showQuestionBoard || !activeQuestion) {
      return;
    }

    const fromEl = oniRef.current;
    const toEl = timeMagicTimerAnchorRef.current;
    if (!fromEl || !toEl) {
      return;
    }

    lv11PhantomLaunchRequestedRef.current = false;
    setLv11EntrancePhantomAnimId((id) => id + 1);
  }, [activeQuestion, showQuestionBoard, oniPhase, awaitingNextOni, lv11EntrancePlaying]);

  // Lv11 から直接開始した場合も 1 問目から幻影→ゲージ（マウント1回のみ）
  useEffect(() => {
    if (
      !isTimeMagicLevel(initialSession.timeAttackState.currentLevel) ||
      lv11InitialPhantomStartedRef.current
    ) {
      return;
    }
    lv11InitialPhantomStartedRef.current = true;
    beginLv11QuestionClockPhantom();
  }, [beginLv11QuestionClockPhantom, initialSession.timeAttackState.currentLevel]);

  useEffect(() => {
    const canTickGauge =
      (Boolean(activeQuestion) || lv11EntrancePlaying) &&
      !submitting &&
      timeMagicGaugeVisible &&
      timeMagicGaugeStartedAtRef.current != null &&
      (!timerPaused || lv11EntrancePlaying);

    if (!canTickGauge) {
      if (!timeMagicGaugeVisible) {
        setTimeMagicSecondsLeft(null);
      }
      return;
    }

    let frameId = 0;
    const tick = () => {
      const gaugeElapsed =
        (Date.now() - (timeMagicGaugeStartedAtRef.current ?? Date.now())) / 1000;
      const secondsLeft = getTimeMagicSecondsRemainingFromGaugeElapsed(gaugeElapsed);
      setTimeMagicSecondsLeft(secondsLeft);

      if (
        secondsLeft <= 0 &&
        timeAttackState.timeMagicPenaltyAtQuestionIndex !==
          timeAttackState.globalQuestionIndex &&
        !timeMagicPenaltyLockRef.current &&
        !submitLockRef.current
      ) {
        timeMagicPenaltyLockRef.current = true;
        void applyTimeMagicPenalty(gaugeElapsed);
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [
    activeQuestion,
    timerPaused,
    submitting,
    timeMagicGaugeVisible,
    lv11EntrancePlaying,
    timeAttackState.globalQuestionIndex,
    timeAttackState.timeMagicPenaltyAtQuestionIndex,
    applyTimeMagicPenalty,
  ]);

  useTimeAttackBgm(sessionId, arenaState);

  useEffect(() => {
    if (!defeatLoading || !isMobileViewport()) {
      return;
    }

    const onVisibilityChange = () => {
      if (!document.hidden && defeatLoading) {
        redirectHome();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [defeatLoading, redirectHome]);

  const syncBossDisplay = (state: TimeAttackState, options?: { startAtZeroHp?: boolean }) => {
    setArenaState(state);
    setDisplayHp(options?.startAtZeroHp ? 0 : state.oniHpRemaining);
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

    try {
      if (prefersReducedMotion()) {
        setRunningScore((score) => score + defeatBonus);
        await delay(motionMs(DEFEAT_MSG_MS, 400));
        return;
      }

      pendingDefeatBonusAmountRef.current = defeatBonus;
      setDefeatBonusFlyLabel(`+${defeatBonus}点ボーナス`);
      setPendingDefeatBonusPoints(defeatBonus);

      const flyTimeoutMs = motionMs(
        SCORE_FLY_DELAY_MS + SCORE_FLY_DURATION_MS + 120,
        900,
      );

      await Promise.race([
        new Promise<void>((resolve) => {
          defeatBonusFlyDoneRef.current = resolve;
          requestAnimationFrame(() => {
            setDefeatBonusAnimId((id) => id + 1);
          });
        }),
        delay(flyTimeoutMs),
      ]);

      if (pendingDefeatBonusAmountRef.current > 0) {
        applyDefeatBonus();
      }

      await delay(getCountUpDurationMs(defeatBonus));
      await delay(motionMs(DEFEAT_MSG_MS, 400));
    } finally {
      setWaveMessage(null);
      setDefeatBonusFlyLabel(null);
      setPendingDefeatBonusPoints(null);
      pendingDefeatBonusAmountRef.current = 0;
      defeatBonusFlyDoneRef.current = null;
    }
  }, [applyDefeatBonus]);

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

  const unlockQuestionInput = (options?: { keepPenaltyCountdown?: boolean }) => {
    const keepPenaltyCountdown = options?.keepPenaltyCountdown ?? false;
    const savedGaugeStartedAt = keepPenaltyCountdown
      ? timeMagicGaugeStartedAtRef.current
      : null;

    setAnswer("");
    questionStartedAtRef.current = Date.now();
    resetTimeMagicPenalty();
    resetLv11EntranceIntro();
    setTimerPaused(false);
    submitLockRef.current = false;
    setSubmitting(false);

    if (isTimeMagicLevel(timeAttackState.currentLevel)) {
      if (keepPenaltyCountdown && savedGaugeStartedAt != null) {
        timeMagicGaugeStartedAtRef.current = savedGaugeStartedAt;
        setTimeMagicGaugeVisible(true);
        const elapsed = (Date.now() - savedGaugeStartedAt) / 1000;
        setTimeMagicSecondsLeft(getTimeMagicSecondsRemainingFromGaugeElapsed(elapsed));
      } else {
        beginLv11QuestionClockPhantom();
      }
    }
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

    const isLv11Entrance = result.timeAttackState.currentLevel === 11;
    const defeatBonus = result.defeatBonus ?? 0;

    if (isLv11Entrance) {
      applyWaveAdvanceState(result.timeAttackState, result.questions, { skipScoreUpdate: true });
      setLv11QuestionRevealed(false);
      setLv11EntrancePlaying(true);
    }

    setAwaitingNextOni(true);

    await delay(motionMs(80, 40));

    syncBossDisplay(result.timeAttackState, { startAtZeroHp: true });
    clearFeedbackPopup();
    if (result.timeAttackState) {
      setRunningScore(result.timeAttackState.totalScore - defeatBonus);
    }
    const defeatBonusPromise = playDefeatBonusAward(defeatBonus);

    if (!isEnmaBoss(result.timeAttackState.currentLevel)) {
      playTimeAttackOniRoarSound();
    }

    setOniPhase("entering");
    if (isLv11Entrance) {
      beginLv11EntranceAtBossEnter();
    }
    await Promise.race([
      waitForOniEnterComplete(),
      delay(motionMs(ONI_ENTER_MS + 80, 320)),
    ]);
    oniEnterDoneRef.current = null;
    setOniPhase("idle");
    await delay(motionMs(ONI_SETTLE_MS, 80));

    // HP回復演出を開始
    setDisplayHp(result.timeAttackState.oniHpRemaining);

    setAwaitingNextOni(false);

    if (!isLv11Entrance) {
      applyWaveAdvanceState(result.timeAttackState, result.questions, { skipScoreUpdate: true });
    }
    setAttackDrain(null);

    if (isLv11Entrance) {
      setDefeatLoading(false);
      await waitForLv11QuestionReveal();
      unlockQuestionInput({ keepPenaltyCountdown: true });
      await defeatBonusPromise;
    } else {
      await defeatBonusPromise;
      unlockQuestionInput();
    }
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
    unlockQuestionInput();
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

  const dismissCorrectPopup = () => {
    setFeedback(null);
    setFeedbackType(null);
    unlockQuestionInput();
  };

  const scheduleCorrectPopupDismiss = () => {
    if (correctPopupTimerRef.current != null) {
      clearTimeout(correctPopupTimerRef.current);
    }
    correctPopupTimerRef.current = setTimeout(() => {
      correctPopupTimerRef.current = null;
      dismissCorrectPopup();
    }, motionMs(CORRECT_POPUP_MS, 350));
  };

  const scheduleTimeAttackCorrectPopupDismiss = () => {
    if (correctPopupTimerRef.current != null) {
      clearTimeout(correctPopupTimerRef.current);
    }
    correctPopupTimerRef.current = setTimeout(() => {
      correctPopupTimerRef.current = null;
      dismissCorrectPopup();
    }, motionMs(TIME_ATTACK_CORRECT_POPUP_MS, 120));
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
      const result = isGuest
        ? submitGuestTimeAttackAnswer(sessionId, numericAnswer, elapsedSeconds)
        : await submitTimeAttackAnswerAction(sessionId, numericAnswer, elapsedSeconds);

      if (result.correct) {
        const isSpecial = Boolean(result.isSpecialMove);
        setIsSpecialMoveActive(isSpecial);

        if (isSpecial) {
          setFeedback("必殺技！");
          setFeedbackType("success");
          setMascotSpecialActive(true);
          await delay(motionMs(500, 200));
          setMascotSpecialActive(false);
        } else {
          setFeedback("正解！");
          setFeedbackType("success");
        }

        // 1. Update Special Move Gauge (Only if regular hit. Special hit updates after zoom)
        if (result.timeAttackState && !isSpecial) {
          setGaugeDisplayScore(result.timeAttackState.specialGaugeCharge);
        }

        if (result.bossDefeated) {
          // Special move gauge resets now that we actually fire the special move
          if (isSpecial && result.timeAttackState) {
            setGaugeDisplayScore(result.timeAttackState.specialGaugeCharge);
          }

          // 2. Play attack animation
          await waitWithMotionFallback(playLightOrbAttack(), LIGHT_ORB_FLY_MS + 80);

          // 3. Projectile hits! Damage the Oni
          setOniPhase("shaking");
          setHpHit(true);
          if (result.timeAttackState) {
            setDisplayHp(result.timeAttackState.oniHpRemaining);
          }

          await delay(motionMs(isSpecial ? ONI_SHAKE_MS : 300, 150));
          setHpHit(false);
          setOniPhase("idle");

          // 4. Update total score
          if (result.timeAttackState) {
            const defeatBonusVal = result.defeatBonus ?? 0;
            setRunningScore(result.timeAttackState.totalScore - defeatBonusVal);
          }

          // 5. Check if boss was defeated
          if (result.timeAttackState) {
            setTimerPaused(true);
            clearFeedbackPopup();

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

            if (result.sessionEnded) {
              await playDefeatBonusAward(result.defeatBonus ?? 0);
              await delay(
                motionMs(
                  isFinalClear ? FINAL_CLEAR_POPUP_MS : DEFEAT_MSG_MS,
                  isFinalClear ? 900 : 400,
                ),
              );
              clearFeedbackPopup();
              redirectToResult(sessionId);
              return;
            }

            // Transition to next boss
            await playHeartRecovery(displayMistakeCount, result.timeAttackState.mistakeCount);

            const isLv11Entrance = result.timeAttackState.currentLevel === 11;
            const defeatBonus = result.defeatBonus ?? 0;

            if (isLv11Entrance) {
              setTimeAttackState(result.timeAttackState);
              setDisplayMistakeCount(result.timeAttackState.mistakeCount);
              setQuestions(result.questions ?? []);
              setGaugeDisplayScore(result.timeAttackState.specialGaugeCharge);

              setLv11QuestionRevealed(false);
              setLv11EntrancePlaying(true);
            }

            setAwaitingNextOni(true);
            await delay(motionMs(80, 40));

            syncBossDisplay(result.timeAttackState, { startAtZeroHp: true });
            clearFeedbackPopup();

            setRunningScore(result.timeAttackState.totalScore);
            const defeatBonusPromise = playDefeatBonusAward(defeatBonus);

            if (!isEnmaBoss(result.timeAttackState.currentLevel)) {
              playTimeAttackOniRoarSound();
            }

            setOniPhase("entering");
            const enterPromise = waitForOniEnterComplete();
            const entranceIntroPromise = isLv11Entrance
              ? delay(50)
              : delay(motionMs(ONI_ENTER_MS + ONI_SETTLE_MS, 300));

            await Promise.all([enterPromise, entranceIntroPromise, defeatBonusPromise]);

            if (isLv11Entrance) {
              beginLv11EntranceAtBossEnter();
              await waitForLv11QuestionReveal();
            }

            // HP回復演出を開始
            setDisplayHp(result.timeAttackState.oniHpRemaining);

            setAwaitingNextOni(false);
            setQuestions(result.questions ?? []);
            setTimeAttackState(result.timeAttackState);
            setDisplayMistakeCount(result.timeAttackState.mistakeCount);
            setGaugeDisplayScore(result.timeAttackState.specialGaugeCharge);
            unlockQuestionInput();
            return;
          }
        } else {
          // Regular correct answer: Non-blocking background animation
          if (result.timeAttackState) {
            const targetHp = result.timeAttackState.oniHpRemaining;
            const targetScore = result.timeAttackState.totalScore;
            const targetGauge = result.timeAttackState.specialGaugeCharge;

            if (isSpecial) {
              // 1. Trigger special attack animation in background
              (async () => {
                try {
                  await waitWithMotionFallback(playLightOrbAttack(), LIGHT_ORB_FLY_MS + 80);
                  setOniPhase("shaking");
                  setHpHit(true);
                  setDisplayHp(targetHp);
                  await delay(motionMs(ONI_SHAKE_MS, 150));
                  setHpHit(false);
                  setOniPhase("idle");
                  setRunningScore(targetScore);
                } catch (err) {
                  console.error("Background special attack error", err);
                }
              })();

              // 2. Instantly reset gauge display score
              setGaugeDisplayScore(targetGauge);

              // 3. Instantly advance question and unlock, clear popup
              setTimeAttackState(result.timeAttackState);
              setDisplayMistakeCount(result.timeAttackState.mistakeCount);
              setQuestions(result.questions ?? []);

              setFeedback(null);
              setFeedbackType(null);
              unlockQuestionInput();
            } else {
              // Trigger the attack animation in the background asynchronously
              (async () => {
                try {
                  // 2. Play attack animation
                  await waitWithMotionFallback(playLightOrbAttack(), LIGHT_ORB_FLY_MS + 80);

                  // 3. Projectile hits! Damage the Oni
                  setOniPhase("shaking");
                  setHpHit(true);
                  setDisplayHp(targetHp);

                  await delay(motionMs(300, 150));
                  setHpHit(false);
                  setOniPhase("idle");

                  // 4. Update total score after projectile hits
                  setRunningScore(targetScore);
                } catch (err) {
                  console.error("Background attack animation error", err);
                }
              })();

              // Trigger gauge light charge animation (flies from correct popup to gauge)
              pendingGaugeTargetRef.current = targetGauge;
              setGaugeLightFillRatio(targetGauge / 100);
              setGaugeLightAnimId((id: number) => id + 1);

              // Update state immediately for the next question (except gauge score, which is updated via animation reach)
              setTimeAttackState(result.timeAttackState);
              setDisplayMistakeCount(result.timeAttackState.mistakeCount);
              setQuestions(result.questions ?? []);

              // Snappy popup dismiss for Time Attack
              scheduleTimeAttackCorrectPopupDismiss();
            }
          }
          return;
        }
      }

      await handleWrongAnswer(result);
      return;
    } catch (err) {
      if (handleSessionError(err)) {
        return;
      }
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

  const question = showQuestionContent ? activeQuestion : null;

  return (
    <div className="time-attack-client quiz-panel mx-auto flex w-full min-h-0 max-w-xl flex-1 flex-col">
      <div ref={quizPanelRef} className="quiz-panel__fit flex w-full flex-1 flex-col gap-3">
      <div className="time-attack-top relative z-20">
        <QuizMascot
          ref={mascotRef}
          className={`time-attack-top__mascot ${mascotSpecialActive ? "time-attack-top__mascot--special" : ""}`}
          comment={waveMessage}
          onHomeClick={backToPlay}
          operation={operation}
          chargeActive={mascotCharging}
          hitActive={mascotHit}
          poisonActive={mascotPoison}
          lightOrbActive={lightOrbFiring}
        />
        <TimeAttackOniScore
          layout="split"
          score={runningScore}
          pointsEarned={pendingDefeatBonusPoints}
          flyLabel={defeatBonusFlyLabel}
          flyClassName="score-fly-badge--streak"
          animId={defeatBonusAnimId}
          getFlyFromElement={getDefeatBonusFlyFromElement}
          onPointsApplied={applyDefeatBonus}
          oniPhase={oniPhase}
          oniRef={oniRef}
          isSpecial={isSpecialMoveActive}
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

      {(showQuestionBoard && activeQuestion) ||
      (showQuestionContent && !awaitingNextOni) ? (
        <div className="quiz-play-area">
          {showQuestionBoard && activeQuestion && (
            <section
              className={`time-attack-board quiz-play-area__question card relative z-20 text-center transition-transform ${showQuestionContent && feedbackType === "success" ? "animate-success" : showQuestionContent && feedbackType === "wrong" ? "animate-retry" : ""}`}
            >
              <div
                ref={timeMagicTimerAnchorRef}
                className="time-magic-timer-anchor"
                aria-hidden="true"
              />
              {timeMagicGaugeVisible && timeMagicSecondsLeft !== null && (
                <TimeMagicCountdown secondsRemaining={timeMagicSecondsLeft} />
              )}
              {showQuestionContent && (
                <div className="chalk-heading equation-display flex flex-nowrap items-center justify-center text-[clamp(1.25rem,6vw,3.75rem)] font-bold">
                  <span className="whitespace-nowrap">
                    {formatExpression(operation, activeQuestion)} =
                  </span>
                  <span className="answer-slot ml-2 shrink-0">{answer || "?"}</span>
                </div>
              )}
            </section>
          )}

          {showQuestionContent && !awaitingNextOni && (
            <div className="time-attack-keypad quiz-play-area__keypad relative z-20">
              <Keypad
                value={answer}
                onChange={setAnswer}
                onSubmit={() => void submitAnswer()}
                disabled={submitting || timerPaused}
                maxDigits={getMaxAnswerDigits(operation, timeAttackState.currentLevel)}
              />
            </div>
          )}
        </div>
      ) : null}

      {error && <p className="feedback-error">{error}</p>}
      </div>

      <MascotLightOrb
        animId={lightOrbAnimId}
        fromRef={mascotRef}
        toRef={oniRef}
        onComplete={handleLightOrbComplete}
        isSpecial={isSpecialMoveActive}
      />

      {alertType === "yellow" && (
        <div className="time-attack-alert time-attack-alert--yellow" aria-hidden="true" />
      )}

      <GaugeLightCharge
        animId={gaugeLightAnimId}
        fromRef={feedbackPopupRef}
        toRef={attackGaugeRef}
        fillRatio={gaugeLightFillRatio}
        attackStream
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

      <Lv11EntranceClockPhantom
        animId={lv11EntrancePhantomAnimId}
        fromRef={oniRef}
        toRef={timeMagicTimerAnchorRef}
        onComplete={handleLv11EntranceClockComplete}
      />

      {screenDarkening && <div className="time-attack-dark-overlay" aria-hidden="true" />}

      {defeatLoading && (
        <div className="time-attack-defeat-loading" role="status" aria-live="polite">
          <span className="time-attack-defeat-loading__spinner" aria-hidden="true" />
          <p className="time-attack-defeat-loading__label">読み込み中...</p>
        </div>
      )}

      {recoveringHome && <SessionRecoveryLoading />}

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

      {mascotSpecialActive && (
        <>
          <div className="special-eye-cutin-overlay" />
          <div className="special-eye-cutin" aria-hidden="true">
            <div className="special-eye-cutin__stripe">
              <div className="special-eye-cutin__inner">
                <div className="special-eye-cutin__image-wrap">
                  <img
                    src={getMascotSrc(operation)}
                    alt=""
                    className="special-eye-cutin__mascot-eye"
                  />
                </div>
                <div className="special-eye-cutin__text-wrap">
                  <span className="special-eye-cutin__text">必殺技！</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
