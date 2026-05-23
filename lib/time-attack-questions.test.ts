import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateTimeAttackQuestions,
  getTimeAttackMaxAnswerDigits,
  hasCarry,
  hasHundredsPlaceCarry,
  hasNoCarry,
} from "./time-attack-questions";
import { getCorrectAnswer } from "./questions";

describe("time-attack-questions", () => {
  it("uses 3 digits for levels 1-7", () => {
    assert.equal(getTimeAttackMaxAnswerDigits(7), 3);
  });

  it("uses 4 digits for levels 8-10", () => {
    assert.equal(getTimeAttackMaxAnswerDigits(8), 4);
    assert.equal(getTimeAttackMaxAnswerDigits(10), 4);
  });

  it("generates level 7 with hundreds-place carry only", () => {
    const questions = generateTimeAttackQuestions(7, 20);
    for (const question of questions) {
      assert.ok(question.operandA >= 10 && question.operandA <= 99);
      assert.ok(question.operandB >= 10 && question.operandB <= 99);
      assert.ok(hasHundredsPlaceCarry(question.operandA, question.operandB));
    }
  });

  it("generates level 8 with 1-999 and 1-99 operands", () => {
    const questions = generateTimeAttackQuestions(8, 20);
    for (const question of questions) {
      const values = [question.operandA, question.operandB];
      assert.ok(values.some((value) => value >= 1 && value <= 99));
      assert.ok(values.some((value) => value >= 1 && value <= 999));
    }
  });

  it("generates level 9-10 with 1-999 operands", () => {
    for (const level of [9, 10] as const) {
      const questions = generateTimeAttackQuestions(level, 20);
      for (const question of questions) {
        assert.ok(question.operandA >= 1 && question.operandA <= 999);
        assert.ok(question.operandB >= 1 && question.operandB <= 999);
        assert.ok(getCorrectAnswer(question) <= 1998);
      }
    }
  });

  it("keeps level 5 as two-digit no carry", () => {
    const questions = generateTimeAttackQuestions(5, 20);
    for (const question of questions) {
      assert.ok(question.operandA >= 10 && question.operandA <= 99);
      assert.ok(question.operandB >= 10 && question.operandB <= 99);
      assert.ok(hasNoCarry(question.operandA, question.operandB));
    }
  });

  it("keeps level 6 as two-digit with carry", () => {
    const questions = generateTimeAttackQuestions(6, 20);
    for (const question of questions) {
      assert.ok(hasCarry(question.operandA, question.operandB));
    }
  });
});
