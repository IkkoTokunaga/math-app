import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Level } from "./questions";
import {
  generateSubtractionQuestions,
  getSubtractionCorrectAnswer,
  getSubtractionMaxAnswerDigits,
  hasBorrow,
  hasNoBorrow,
} from "./subtraction-questions";

describe("subtraction-questions", () => {
  it("uses 3 answer digits for all levels", () => {
    for (let level = 1; level <= 10; level += 1) {
      assert.equal(getSubtractionMaxAnswerDigits(level as Level), 3);
    }
  });

  it("generates level 1 with no borrow", () => {
    const questions = generateSubtractionQuestions(1, 20);
    for (const question of questions) {
      assert.ok(question.operandA >= 1 && question.operandA <= 9);
      assert.ok(question.operandB >= 1 && question.operandB <= 9);
      assert.ok(question.operandA >= question.operandB);
      assert.ok(hasNoBorrow(question.operandA, question.operandB));
      assert.ok(getSubtractionCorrectAnswer(question) >= 0);
    }
  });

  it("generates level 2 with borrow", () => {
    const questions = generateSubtractionQuestions(2, 20);
    for (const question of questions) {
      assert.ok(question.operandA >= 10 && question.operandA <= 99);
      assert.ok(question.operandB >= 1 && question.operandB <= 9);
      assert.ok(hasBorrow(question.operandA, question.operandB));
    }
  });

  it("generates level 3 with no borrow", () => {
    const questions = generateSubtractionQuestions(3, 20);
    for (const question of questions) {
      assert.ok(question.operandA >= 10 && question.operandA <= 99);
      assert.ok(question.operandB >= 1 && question.operandB <= 9);
      assert.ok(hasNoBorrow(question.operandA, question.operandB));
    }
  });

  it("generates level 4-5 as two-digit subtraction", () => {
    const noBorrow = generateSubtractionQuestions(4, 20);
    for (const question of noBorrow) {
      assert.ok(question.operandA >= 10 && question.operandA <= 99);
      assert.ok(question.operandB >= 10 && question.operandB <= 99);
      assert.ok(question.operandA >= question.operandB);
      assert.ok(hasNoBorrow(question.operandA, question.operandB));
    }

    const withBorrow = generateSubtractionQuestions(5, 20);
    for (const question of withBorrow) {
      assert.ok(hasBorrow(question.operandA, question.operandB));
    }
  });

  it("generates level 6 as three-digit minus two-digit without borrow", () => {
    const questions = generateSubtractionQuestions(6, 20);
    for (const question of questions) {
      assert.ok(question.operandA >= 100 && question.operandA <= 999);
      assert.ok(question.operandB >= 10 && question.operandB <= 99);
      assert.ok(hasNoBorrow(question.operandA, question.operandB));
    }
  });

  it("generates level 7 as three two-digit terms", () => {
    const questions = generateSubtractionQuestions(7, 20);
    for (const question of questions) {
      assert.ok(question.operandA >= 10 && question.operandA <= 99);
      assert.ok(question.operandB >= 10 && question.operandB <= 99);
      assert.ok(question.operandC != null);
      assert.ok(question.operandC >= 10 && question.operandC <= 99);
      const answer = getSubtractionCorrectAnswer(question);
      assert.ok(answer >= 0 && answer <= 999);
    }
  });

  it("generates level 8-9 as three-digit subtraction", () => {
    const noBorrow = generateSubtractionQuestions(8, 20);
    for (const question of noBorrow) {
      assert.ok(question.operandA >= 100 && question.operandA <= 999);
      assert.ok(question.operandB >= 100 && question.operandB <= 999);
      assert.ok(hasNoBorrow(question.operandA, question.operandB));
    }

    const withBorrow = generateSubtractionQuestions(9, 20);
    for (const question of withBorrow) {
      assert.ok(hasBorrow(question.operandA, question.operandB));
    }
  });

  it("generates level 10 as three three-digit terms", () => {
    const questions = generateSubtractionQuestions(10, 20);
    for (const question of questions) {
      assert.ok(question.operandA >= 100 && question.operandA <= 999);
      assert.ok(question.operandB >= 100 && question.operandB <= 999);
      assert.ok(question.operandC != null);
      assert.ok(question.operandC >= 100 && question.operandC <= 999);
      assert.ok(getSubtractionCorrectAnswer(question) >= 0);
    }
  });

  it("does not repeat ordered pairs within a session", () => {
    const questions = generateSubtractionQuestions(4, 10);
    const keys = questions.map(
      (question) => `${question.operandA},${question.operandB}`,
    );
    assert.equal(keys.length, new Set(keys).size);
  });

  it("never uses 0 as a subtrahend", () => {
    for (let level = 1; level <= 10; level += 1) {
      const questions = generateSubtractionQuestions(level as Level, 20);
      for (const question of questions) {
        assert.notEqual(question.operandB, 0);
        if (question.operandC != null) {
          assert.notEqual(question.operandC, 0);
        }
      }
    }
  });
});
