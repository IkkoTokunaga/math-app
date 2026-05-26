import type { Question } from "./db/schema";

export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const QUESTIONS_PER_SESSION = 10;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 各桁の和がすべて 10 未満（繰り上がりなし） */
export function hasNoCarry(...operands: number[]): boolean {
  const maxDigits = Math.max(...operands.map((value) => String(value).length));
  for (let pos = 0; pos < maxDigits; pos += 1) {
    const power = 10 ** pos;
    let sum = 0;
    for (const value of operands) {
      sum += Math.floor(value / power) % 10;
    }
    if (sum >= 10) {
      return false;
    }
  }
  return true;
}

export function hasCarry(...operands: number[]): boolean {
  return !hasNoCarry(...operands);
}

function twoOperandKey(a: number, b: number): string {
  return a <= b ? `${a},${b}` : `${b},${a}`;
}

function threeOperandKey(a: number, b: number, c: number): string {
  return [a, b, c].sort((x, y) => x - y).join(",");
}

export function questionKey(question: Question): string {
  if (question.operandC != null) {
    return threeOperandKey(question.operandA, question.operandB, question.operandC);
  }
  return twoOperandKey(question.operandA, question.operandB);
}

export function formatQuestionExpression(question: Question): string {
  const parts = [question.operandA, question.operandB];
  if (question.operandC != null) {
    parts.push(question.operandC);
  }
  return parts.join(" + ");
}

export function getMaxAnswerDigits(level: Level): number {
  return level === 10 ? 4 : 3;
}

function generateLevel1(): Question {
  while (true) {
    const operandA = randomInt(1, 9);
    const operandB = randomInt(1, 9);
    if (operandA + operandB <= 9) {
      return { operandA, operandB };
    }
  }
}

function generateLevel2(): Question {
  while (true) {
    const operandA = randomInt(1, 9);
    const operandB = randomInt(1, 9);
    if (operandA + operandB >= 10) {
      return { operandA, operandB };
    }
  }
}

function generateMixedDigitPair(requireCarry: boolean): Question {
  while (true) {
    const oneDigit = randomInt(1, 9);
    const twoDigit = randomInt(10, 99);
    const swap = Math.random() < 0.5;
    const operandA = swap ? oneDigit : twoDigit;
    const operandB = swap ? twoDigit : oneDigit;
    const carries = hasCarry(operandA, operandB);
    if (requireCarry ? carries : !carries) {
      return { operandA, operandB };
    }
  }
}

function generateTwoDigitPair(requireCarry: boolean): Question {
  while (true) {
    const operandA = randomInt(10, 99);
    const operandB = randomInt(10, 99);
    const carries = hasCarry(operandA, operandB);
    if (requireCarry ? carries : !carries) {
      return { operandA, operandB };
    }
  }
}

function generateThreeDigitPair(requireCarry: boolean): Question {
  while (true) {
    const operandA = randomInt(100, 999);
    const operandB = randomInt(100, 999);
    const carries = hasCarry(operandA, operandB);
    if (requireCarry ? carries : !carries) {
      return { operandA, operandB };
    }
  }
}

function generateLevel7(): Question {
  return {
    operandA: randomInt(10, 99),
    operandB: randomInt(10, 99),
    operandC: randomInt(10, 99),
  };
}

function generateLevel10(): Question {
  return {
    operandA: randomInt(100, 999),
    operandB: randomInt(100, 999),
    operandC: randomInt(100, 999),
  };
}

const generators: Record<Level, () => Question> = {
  1: generateLevel1,
  2: generateLevel2,
  3: () => generateMixedDigitPair(false),
  4: () => generateMixedDigitPair(true),
  5: () => generateTwoDigitPair(false),
  6: () => generateTwoDigitPair(true),
  7: generateLevel7,
  8: () => generateThreeDigitPair(false),
  9: () => generateThreeDigitPair(true),
  10: generateLevel10,
};

export function generateQuestions(
  level: Level,
  count = QUESTIONS_PER_SESSION,
): Question[] {
  const seen = new Set<string>();
  const questions: Question[] = [];
  let attempts = 0;
  const maxAttempts = count * 200;

  while (questions.length < count && attempts < maxAttempts) {
    attempts += 1;
    const question = generators[level]();
    const key = questionKey(question);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    questions.push(question);
  }

  if (questions.length < count) {
    throw new Error(`Could not generate ${count} unique questions for level ${level}`);
  }

  return questions;
}

export function getCorrectAnswer(question: Question): number {
  return question.operandA + question.operandB + (question.operandC ?? 0);
}
