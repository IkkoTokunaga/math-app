import type { Level } from "@/lib/questions";
import {
  ENMA_STAGE_DOUBLE_HP,
  ENMA_STAGE_NORMAL,
  getBossParams,
  type TimeAttackState,
} from "@/lib/time-attack";
import { calculateOniMaxHp } from "@/lib/time-attack-scoring";

export type DevTimeAttackStart = {
  level: Level;
  enmaNumber: number;
  /** 開発用: ボス HP を 1 にして撃破→次ボス遷移をすぐ試す */
  nearDefeat?: boolean;
};

function toSearchParams(
  params: URLSearchParams | Record<string, string | undefined>,
): URLSearchParams {
  if (params instanceof URLSearchParams) {
    return params;
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, value);
    }
  }
  return search;
}

function resolveEnmaNumber(level: Level): number {
  if (level >= 10) {
    return ENMA_STAGE_DOUBLE_HP;
  }
  if (level >= 9) {
    return ENMA_STAGE_NORMAL;
  }
  return 0;
}

/** 開発用: 指定 Lv から wave_active 状態を生成する */
export function createDevTimeAttackState(start: DevTimeAttackStart): TimeAttackState {
  const level = start.level;
  const enmaNumber = resolveEnmaNumber(level);
  const params = getBossParams(level, enmaNumber);
  const oniHpMax = calculateOniMaxHp(
    level,
    params.timeLimitSeconds,
    params.timeBonusMultiplier,
    enmaNumber,
  );
  const bossesDefeated = level - 1;

  const oniHpRemaining = start.nearDefeat ? 1 : oniHpMax;

  return {
    currentLevel: level,
    enmaNumber,
    oniHpRemaining,
    oniHpMax,
    mistakeCount: 0,
    waveQuestionIndex: 0,
    globalQuestionIndex: 0,
    waveScoreAccumulated: 0,
    bossScoreAccumulated: 0,
    totalScore: 0,
    timeLimitSeconds: params.timeLimitSeconds,
    timeBonusMultiplier: params.timeBonusMultiplier,
    bossesDefeated,
    phase: "wave_active",
    specialGaugeCharge: 0,
  };
}

export function parseDevTimeAttackStart(
  params: URLSearchParams | Record<string, string | undefined>,
): DevTimeAttackStart | null {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const search = toSearchParams(params);
  const devStart = search.get("devStart");
  if (!devStart) {
    return null;
  }

  const level = Number.parseInt(devStart, 10);
  if (!Number.isFinite(level) || level < 1 || level > 11) {
    return null;
  }

  const nearDefeat = search.get("devNearDefeat") === "1";

  return {
    level: level as Level,
    enmaNumber: resolveEnmaNumber(level as Level),
    nearDefeat,
  };
}
