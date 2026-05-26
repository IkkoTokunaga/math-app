import type { Level } from "@/lib/questions";
import {
  calculateOniMaxHp,
  calculateWaveMaxScore,
  WAVE_QUESTION_COUNT,
} from "@/lib/time-attack-scoring";

export { getOniHpRatio, WAVE_QUESTION_COUNT } from "@/lib/time-attack-scoring";

/** Lv9 = 閻魔、Lv10 = 閻魔（HP倍率×4） */
export const ENMA_STAGE_NORMAL = 1;
export const ENMA_STAGE_DOUBLE_HP = 2;

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
  failReason?: "mistakes";
};

export type EnmaParams = {
  timeLimitSeconds: number;
  timeBonusMultiplier: number;
};

export function getBossParams(level: Level, enmaNumber: number): EnmaParams {
  if (level < 9) {
    return { timeLimitSeconds: 10, timeBonusMultiplier: 1 };
  }
  if (level === 9) {
    return { timeLimitSeconds: 10, timeBonusMultiplier: 1 };
  }
  if (enmaNumber === ENMA_STAGE_DOUBLE_HP) {
    return { timeLimitSeconds: 7, timeBonusMultiplier: 10 };
  }
  return { timeLimitSeconds: 10, timeBonusMultiplier: 1 };
}

export function createInitialTimeAttackState(): TimeAttackState {
  const level = 1 as Level;
  const enmaNumber = 0;
  const params = getBossParams(level, enmaNumber);
  const oniHpMax = calculateOniMaxHp(
    level,
    params.timeLimitSeconds,
    params.timeBonusMultiplier,
    enmaNumber,
  );

  return {
    currentLevel: level,
    enmaNumber,
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

export function isEnmaBoss(level: Level): boolean {
  return level >= 9;
}

export function getBossLabel(state: TimeAttackState): string {
  if (isEnmaBoss(state.currentLevel)) {
    return "閻魔大王";
  }
  return `おに Lv${state.currentLevel}`;
}

/** タイムアタック HP ゲージ見出し（ボス名 + HP を1行） */
export function getBossHpLabel(state: TimeAttackState): string {
  if (isEnmaBoss(state.currentLevel)) {
    return "閻魔大王 HP";
  }
  return `鬼 Lv${state.currentLevel} HP`;
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

function buildBossState(
  afterBonus: TimeAttackState,
  level: Level,
  enmaNumber: number,
): TimeAttackState {
  const params = getBossParams(level, enmaNumber);
  const oniHpMax = calculateOniMaxHp(
    level,
    params.timeLimitSeconds,
    params.timeBonusMultiplier,
    enmaNumber,
  );

  return {
    ...afterBonus,
    currentLevel: level,
    enmaNumber,
    oniHpRemaining: oniHpMax,
    oniHpMax,
    timeLimitSeconds: params.timeLimitSeconds,
    timeBonusMultiplier: params.timeBonusMultiplier,
  };
}

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
    mistakeCount: Math.max(0, state.mistakeCount - 1),
  };

  if (state.currentLevel < 9) {
    const newLevel = (state.currentLevel + 1) as Level;
    const enmaNumber = newLevel >= 9 ? ENMA_STAGE_NORMAL : 0;

    return {
      kind: "defeated",
      defeatBonus,
      cleared: false,
      state: buildBossState(afterBonus, newLevel, enmaNumber),
    };
  }

  if (state.currentLevel === 9) {
    return {
      kind: "defeated",
      defeatBonus,
      cleared: false,
      state: buildBossState(afterBonus, 10, ENMA_STAGE_DOUBLE_HP),
    };
  }

  return {
    kind: "defeated",
    defeatBonus,
    cleared: true,
    state: {
      ...afterBonus,
      currentLevel: 10,
      enmaNumber: ENMA_STAGE_DOUBLE_HP,
      phase: "cleared",
    },
  };
}

export function getWaveMaxScoreForState(state: TimeAttackState): number {
  return calculateWaveMaxScore(
    state.currentLevel,
    state.timeLimitSeconds,
    state.timeBonusMultiplier,
    WAVE_QUESTION_COUNT,
  );
}
