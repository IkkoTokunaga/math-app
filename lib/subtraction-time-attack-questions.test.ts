import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateSubtractionTimeAttackQuestions,
  getSubtractionTimeAttackMaxAnswerDigits,
  hasHundredsPlaceBorrow,
} from "./subtraction-time-attack-questions";
import {
  getSubtractionCorrectAnswer,
  hasBorrow,
  hasNoBorrow,
  hasZeroSubtrahend,
  subtractionQuestionKey,
} from "./subtraction-questions";

describe("subtraction-time-attack-questions", () => {
  it("uses 3 digits at all levels", () => {
    for (let level = 1; level <= 10; level += 1) {
      assert.equal(getSubtractionTimeAttackMaxAnswerDigits(level as 1), 3);
    }
  });

  it("generates unique two-operand questions for every level", () => {
    for (let level = 1; level <= 10; level += 1) {
      const questions = generateSubtractionTimeAttackQuestions(level as 1, 5);
      assert.equal(questions.length, 5);
      const keys = new Set(questions.map(subtractionQuestionKey));
      assert.equal(keys.size, 5);
      for (const question of questions) {
        assert.equal(question.operandC, undefined);
        assert.equal(hasZeroSubtrahend(question), false);
        assert.ok(getSubtractionCorrectAnswer(question) >= 0);
      }
    }
  });

  it("generates level 1 as 1-digit no borrow", () => {
    const questions = generateSubtractionTimeAttackQuestions(1, 20);
    for (const question of questions) {
      assert.ok(question.operandA >= 1 && question.operandA <= 9);
      assert.ok(question.operandB >= 1 && question.operandB <= 9);
      assert.ok(hasNoBorrow(question.operandA, question.operandB));
    }
  });

  it("generates level 2 as 2-digit minus 1-digit with borrow", () => {
    const questions = generateSubtractionTimeAttackQuestions(2, 20);
    for (const question of questions) {
      assert.ok(question.operandA >= 10 && question.operandA <= 99);
      assert.ok(question.operandB >= 1 && question.operandB <= 9);
      assert.ok(hasBorrow(question.operandA, question.operandB));
    }
  });

  it("generates level 6 as 3-digit minus 2-digit no borrow", () => {
    const questions = generateSubtractionTimeAttackQuestions(6, 20);
    for (const question of questions) {
      assert.ok(question.operandA >= 100 && question.operandA <= 999);
      assert.ok(question.operandB >= 10 && question.operandB <= 99);
      assert.ok(hasNoBorrow(question.operandA, question.operandB));
    }
  });

  it("generates level 7 with hundreds-place borrow", () => {
    const questions = generateSubtractionTimeAttackQuestions(7, 20);
    for (const question of questions) {
      assert.ok(question.operandA >= 100 && question.operandA <= 999);
      assert.ok(question.operandB >= 10 && question.operandB <= 99);
      assert.ok(hasBorrow(question.operandA, question.operandB));
      assert.ok(hasHundredsPlaceBorrow(question.operandA, question.operandB));
    }
  });

  it("generates level 8 as 3-digit minus 3-digit no borrow", () => {
    const questions = generateSubtractionTimeAttackQuestions(8, 20);
    for (const question of questions) {
      assert.ok(question.operandA >= 100 && question.operandA <= 999);
      assert.ok(question.operandB >= 100 && question.operandB <= 999);
      assert.ok(hasNoBorrow(question.operandA, question.operandB));
    }
  });

  it("generates level 9-10 as 3-digit minus 3-digit with borrow", () => {
    for (const level of [9, 10] as const) {
      const questions = generateSubtractionTimeAttackQuestions(level, 20);
      for (const question of questions) {
        assert.ok(question.operandA >= 100 && question.operandA <= 999);
        assert.ok(question.operandB >= 100 && question.operandB <= 999);
        assert.ok(hasBorrow(question.operandA, question.operandB));
      }
    }
  });
});
