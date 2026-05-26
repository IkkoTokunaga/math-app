import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDevTimeAttackState } from "./dev-time-attack-setup";
import {
  applyWaveDamage,
  createInitialTimeAttackState,
  ENMA_STAGE_DOUBLE_HP,
  ENMA_STAGE_NORMAL,
  getBossHpLabel,
  getBossParams,
} from "./time-attack";
import {
  calculateDefeatBonus,
  calculateOniMaxHp,
  calculateTimeAttackQuestionScore,
  calculateWaveMaxScore,
  getOniHpRatio,
  getRemainingBonusSeconds,
  WAVE_QUESTION_COUNT,
} from "./time-attack-scoring";

describe("time-attack-scoring", () => {
  it("uses five questions per wave", () => {
    assert.equal(WAVE_QUESTION_COUNT, 5);
  });

  it("calculates level 1 wave maximum", () => {
    assert.equal(calculateWaveMaxScore(1, 10, 1), 100);
    assert.equal(calculateOniMaxHp(1, 10, 1, 0), 425);
  });

  it("uses level-scaled HP ratios", () => {
    assert.equal(getOniHpRatio(1, 0), 5);
    assert.equal(getOniHpRatio(5, 0), 3);
    assert.equal(getOniHpRatio(8, 0), 2);
    assert.equal(getOniHpRatio(9, 1), 2);
    assert.equal(getOniHpRatio(10, 2), 4);
  });

  it("calculates level 10 Enma double HP wave maximum", () => {
    assert.equal(calculateWaveMaxScore(10, 7, 10), 4000);
    assert.equal(calculateOniMaxHp(10, 7, 10, 2), 13600);
  });

  it("awards base points only after bonus time expires", () => {
    const score = calculateTimeAttackQuestionScore(3, 12, 10, 1);
    assert.equal(score.basePoints, 30);
    assert.equal(score.timeBonus, 0);
    assert.equal(score.pointsEarned, 30);
  });

  it("applies time bonus multiplier for level 10 Enma double", () => {
    const score = calculateTimeAttackQuestionScore(10, 1, 7, 10);
    assert.equal(score.basePoints, 100);
    assert.equal(score.timeBonus, 700);
    assert.equal(score.pointsEarned, 800);
  });

  it("calculates defeat bonus as half of wave score", () => {
    assert.equal(calculateDefeatBonus(400), 200);
  });

  it("respects grace period for remaining seconds", () => {
    assert.equal(getRemainingBonusSeconds(0.5, 10), 10);
    assert.equal(getRemainingBonusSeconds(2, 10), 9);
  });
});

describe("time-attack state", () => {
  it("starts at level 1 with full HP", () => {
    const state = createInitialTimeAttackState();
    assert.equal(state.currentLevel, 1);
    assert.equal(state.oniHpRemaining, state.oniHpMax);
    assert.equal(state.oniHpMax, 425);
    assert.equal(state.enmaNumber, 0);
  });

  it("carries HP when wave damage is insufficient", () => {
    const state = createInitialTimeAttackState();
    const result = applyWaveDamage(state, 50);
    assert.equal(result.kind, "continue");
    if (result.kind === "continue") {
      assert.equal(result.state.oniHpRemaining, state.oniHpRemaining - 50);
      assert.equal(result.state.currentLevel, 1);
    }
  });

  it("advances level after oni defeat", () => {
    const state = createInitialTimeAttackState();
    const result = applyWaveDamage(state, state.oniHpMax);
    assert.equal(result.kind, "defeated");
    if (result.kind === "defeated") {
      assert.equal(result.state.currentLevel, 2);
      assert.equal(result.cleared, false);
    }
  });

  it("advances from level 8 to Enma at level 9", () => {
    const state = createDevTimeAttackState({ level: 8, enmaNumber: 0 });
    const result = applyWaveDamage(state, state.oniHpMax);
    assert.equal(result.kind, "defeated");
    if (result.kind === "defeated") {
      assert.equal(result.state.currentLevel, 9);
      assert.equal(result.state.enmaNumber, ENMA_STAGE_NORMAL);
      assert.equal(result.cleared, false);
    }
  });

  it("advances from Enma level 9 to double-HP level 10", () => {
    const state = createDevTimeAttackState({ level: 9, enmaNumber: ENMA_STAGE_NORMAL });
    const result = applyWaveDamage(state, state.oniHpMax);
    assert.equal(result.kind, "defeated");
    if (result.kind === "defeated") {
      assert.equal(result.state.currentLevel, 10);
      assert.equal(result.state.enmaNumber, ENMA_STAGE_DOUBLE_HP);
      assert.equal(result.cleared, false);
    }
  });

  it("clears after level 10 Enma double HP defeat", () => {
    const state = createDevTimeAttackState({ level: 10, enmaNumber: ENMA_STAGE_DOUBLE_HP });
    const result = applyWaveDamage(state, state.oniHpMax);
    assert.equal(result.kind, "defeated");
    if (result.kind === "defeated") {
      assert.equal(result.cleared, true);
      assert.equal(result.state.phase, "cleared");
    }
  });

  it("maps level 10 boss parameters", () => {
    assert.deepEqual(getBossParams(10, ENMA_STAGE_DOUBLE_HP), {
      timeLimitSeconds: 7,
      timeBonusMultiplier: 10,
    });
  });
});

describe("time-attack boss labels", () => {
  it("formats combined HP gauge labels", () => {
    const oni = createInitialTimeAttackState();
    assert.equal(getBossHpLabel(oni), "鬼 Lv1 HP");

    const enma = createDevTimeAttackState({ level: 9, enmaNumber: ENMA_STAGE_NORMAL });
    assert.equal(getBossHpLabel(enma), "閻魔大王 HP");
  });
});

describe("dev-time-attack-setup", () => {
  it("starts at requested oni level", () => {
    const state = createDevTimeAttackState({ level: 5, enmaNumber: 0 });
    assert.equal(state.currentLevel, 5);
    assert.equal(state.enmaNumber, 0);
    assert.equal(state.bossesDefeated, 4);
    assert.equal(state.phase, "wave_active");
  });

  it("starts at requested Enma level 9", () => {
    const state = createDevTimeAttackState({ level: 9, enmaNumber: 0 });
    assert.equal(state.currentLevel, 9);
    assert.equal(state.enmaNumber, ENMA_STAGE_NORMAL);
    assert.equal(state.bossesDefeated, 8);
    assert.equal(state.timeLimitSeconds, 10);
    assert.equal(state.timeBonusMultiplier, 1);
  });

  it("starts at requested Enma level 10 double HP", () => {
    const state = createDevTimeAttackState({ level: 10, enmaNumber: 0 });
    assert.equal(state.currentLevel, 10);
    assert.equal(state.enmaNumber, ENMA_STAGE_DOUBLE_HP);
    assert.equal(state.bossesDefeated, 9);
    assert.equal(state.timeLimitSeconds, 7);
    assert.equal(state.timeBonusMultiplier, 10);
  });
});
