import type { Level } from "@/lib/questions";
import {
  calculateOniMaxHp,
  calculateWaveMaxScore,
} from "@/lib/time-attack-scoring";

export const MAX_ENMA_NUMBER = 10;

export type TimeAttackPhase = "wave_active" | "cleared" | "failed";

export type TimeAttackState = {
  currentLevel: Level;
  enmaNumber: number;
  oniHpRemaining: number;
  oniHpMax: number;
  mistakeCount: number;
  waveQuestionIndex: number;
  globalQuestionIndex: number;
  waveScoreAccumulated: number;
  totalScore: number;
  timeLimitSeconds: number;
  timeBonusMultiplier: number;
  bossesDefeated: number;
  phase: TimeAttackPhase;
  failReason?: "timeout" | "mistakes";
};

export type EnmaParams = {
  timeLimitSeconds: number;
  timeBonusMultiplier: number;
};

export function getEnmaParams(enmaNumber: number): EnmaParams {
  const clamped = Math.max(1, Math.min(MAX_ENMA_NUMBER, enmaNumber));
  return {
    timeLimitSeconds: Math.max(7, 11 - clamped),
    timeBonusMultiplier: clamped,
  };
}

export function getBossParams(level: Level, enmaNumber: number): EnmaParams {
  if (level < 10) {
    return { timeLimitSeconds: 10, timeBonusMultiplier: 1 };
  }
  if (enmaNumber <= 0) {
    return getEnmaParams(1);
  }
  return getEnmaParams(enmaNumber);
}

export function createInitialTimeAttackState(): TimeAttackState {
  const level = 1 as Level;
  const params = getBossParams(level, 0);
  const oniHpMax = calculateOniMaxHp(level, params.timeLimitSeconds, params.timeBonusMultiplier);

  return {
    currentLevel: level,
    enmaNumber: 0,
    oniHpRemaining: oniHpMax,
    oniHpMax,
    mistakeCount: 0,
    waveQuestionIndex: 0,
    globalQuestionIndex: 0,
    waveScoreAccumulated: 0,
    totalScore: 0,
    timeLimitSeconds: params.timeLimitSeconds,
    timeBonusMultiplier: params.timeBonusMultiplier,
    bossesDefeated: 0,
    phase: "wave_active",
  };
}

export function isEnmaBoss(level: Level, enmaNumber: number): boolean {
  return level >= 10 && enmaNumber > 0;
}

export function getBossLabel(state: TimeAttackState): string {
  if (isEnmaBoss(state.currentLevel, state.enmaNumber)) {
    return `閻魔大王 #${state.enmaNumber}`;
  }
  return `おに Lv${state.currentLevel}`;
}

export type WaveResolution =
  | {
      kind: "continue";
      state: TimeAttackState;
    }
  | {
      kind: "defeated";
      state: TimeAttackState;
      defeatBonus: number;
      cleared: boolean;
    };

export function applyWaveDamage(state: TimeAttackState, waveScore: number): WaveResolution {
  const next: TimeAttackState = {
    ...state,
    waveScoreAccumulated: 0,
    waveQuestionIndex: 0,
    totalScore: state.totalScore + waveScore,
  };

  const remainingHp = state.oniHpRemaining - waveScore;

  if (remainingHp > 0) {
    return {
      kind: "continue",
      state: {
        ...next,
        oniHpRemaining: remainingHp,
      },
    };
  }

  const defeatBonus = Math.floor(waveScore * 0.5);
  const afterBonus: TimeAttackState = {
    ...next,
    oniHpRemaining: 0,
    totalScore: next.totalScore + defeatBonus,
    bossesDefeated: state.bossesDefeated + 1,
  };

  if (state.currentLevel < 10) {
    const newLevel = (state.currentLevel + 1) as Level;
    const enmaNumber = newLevel === 10 ? 1 : 0;
    const params = getBossParams(newLevel, enmaNumber);
    const oniHpMax = calculateOniMaxHp(
      newLevel,
      params.timeLimitSeconds,
      params.timeBonusMultiplier,
    );

    return {
      kind: "defeated",
      defeatBonus,
      cleared: false,
      state: {
        ...afterBonus,
        currentLevel: newLevel,
        enmaNumber,
        oniHpRemaining: oniHpMax,
        oniHpMax,
        timeLimitSeconds: params.timeLimitSeconds,
        timeBonusMultiplier: params.timeBonusMultiplier,
      },
    };
  }

  if (state.enmaNumber >= MAX_ENMA_NUMBER) {
    return {
      kind: "defeated",
      defeatBonus,
      cleared: true,
      state: {
        ...afterBonus,
        currentLevel: 10,
        enmaNumber: MAX_ENMA_NUMBER,
        phase: "cleared",
      },
    };
  }

  const advancedEnma = state.enmaNumber + 1;
  const params = getEnmaParams(advancedEnma);
  const oniHpMax = calculateOniMaxHp(10, params.timeLimitSeconds, params.timeBonusMultiplier);

  return {
    kind: "defeated",
    defeatBonus,
    cleared: false,
    state: {
      ...afterBonus,
      currentLevel: 10,
      enmaNumber: advancedEnma,
      oniHpRemaining: oniHpMax,
      oniHpMax,
      timeLimitSeconds: params.timeLimitSeconds,
      timeBonusMultiplier: params.timeBonusMultiplier,
    },
  };
}

export function getWaveMaxScoreForState(state: TimeAttackState): number {
  return calculateWaveMaxScore(
    state.currentLevel,
    state.timeLimitSeconds,
    state.timeBonusMultiplier,
  );
}
