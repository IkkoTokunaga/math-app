import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyWaveDamage,
  createInitialTimeAttackState,
  getEnmaParams,
  MAX_ENMA_NUMBER,
} from "./time-attack";
import {
  calculateDefeatBonus,
  calculateOniMaxHp,
  calculateTimeAttackQuestionScore,
  calculateWaveMaxScore,
  getRemainingBonusSeconds,
} from "./time-attack-scoring";

describe("time-attack-scoring", () => {
  it("calculates level 1 wave maximum", () => {
    assert.equal(calculateWaveMaxScore(1, 10, 1), 200);
    assert.equal(calculateOniMaxHp(1, 10, 1), 170);
  });

  it("calculates Enma #6 wave maximum at level 10", () => {
    assert.equal(calculateWaveMaxScore(10, 7, 6), 5200);
    assert.equal(calculateOniMaxHp(10, 7, 6), 4420);
  });

  it("applies time bonus multiplier for Enma #10", () => {
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

  it("clears after Enma #10 defeat", () => {
    const params = getEnmaParams(MAX_ENMA_NUMBER);
    const hp = calculateOniMaxHp(10, params.timeLimitSeconds, params.timeBonusMultiplier);
    const state = {
      ...createInitialTimeAttackState(),
      currentLevel: 10 as const,
      enmaNumber: MAX_ENMA_NUMBER,
      oniHpRemaining: hp,
      oniHpMax: hp,
      timeLimitSeconds: params.timeLimitSeconds,
      timeBonusMultiplier: params.timeBonusMultiplier,
    };
    const result = applyWaveDamage(state, hp);
    assert.equal(result.kind, "defeated");
    if (result.kind === "defeated") {
      assert.equal(result.cleared, true);
      assert.equal(result.state.phase, "cleared");
    }
  });

  it("maps Enma #5 parameters", () => {
    assert.deepEqual(getEnmaParams(5), { timeLimitSeconds: 7, timeBonusMultiplier: 5 });
  });
});
