import type { Question } from "./db/schema";
import {
  generateQuestions,
  hasCarry,
  hasNoCarry,
  questionKey,
  type Level,
} from "./questions";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function twoOperandKey(a: number, b: number): string {
  return a <= b ? `${a},${b}` : `${b},${a}`;
}

/** 十の位（100の位への繰り上がり）で繰り上がる */
function hasHundredsPlaceCarry(operandA: number, operandB: number): boolean {
  const tensA = Math.floor(operandA / 10) % 10;
  const tensB = Math.floor(operandB / 10) % 10;
  return tensA + tensB >= 10;
}

function generateTwoDigitHundredsCarry(): Question {
  while (true) {
    const operandA = randomInt(10, 99);
    const operandB = randomInt(10, 99);
    if (hasHundredsPlaceCarry(operandA, operandB)) {
      return { operandA, operandB };
    }
  }
}

function generateMixedRangePair(): Question {
  const oneTo999 = randomInt(1, 999);
  const oneTo99 = randomInt(1, 99);
  const swap = Math.random() < 0.5;
  return {
    operandA: swap ? oneTo99 : oneTo999,
    operandB: swap ? oneTo999 : oneTo99,
  };
}

function generateUpTo999Pair(): Question {
  return {
    operandA: randomInt(1, 999),
    operandB: randomInt(1, 999),
  };
}

const timeAttackGenerators: Partial<Record<Level, () => Question>> = {
  7: generateTwoDigitHundredsCarry,
  8: generateMixedRangePair,
  9: generateUpTo999Pair,
  10: generateUpTo999Pair,
  11: generateUpTo999Pair,
};

export function getTimeAttackMaxAnswerDigits(level: Level): number {
  return level >= 8 ? 4 : 3;
}

export function generateTimeAttackQuestions(
  level: Level,
  count: number,
): Question[] {
  const customGenerator = timeAttackGenerators[level];
  if (!customGenerator) {
    return generateQuestions(level, count);
  }

  const seen = new Set<string>();
  const questions: Question[] = [];
  let attempts = 0;
  const maxAttempts = count * 200;

  while (questions.length < count && attempts < maxAttempts) {
    attempts += 1;
    const question = customGenerator();
    const key = questionKey(question);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    questions.push(question);
  }

  if (questions.length < count) {
    throw new Error(
      `Could not generate ${count} unique time attack questions for level ${level}`,
    );
  }

  return questions;
}

export {
  hasCarry,
  hasHundredsPlaceCarry,
  hasNoCarry,
  twoOperandKey,
};
