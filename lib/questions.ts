import type { Question } from "./db/schema";

export type Level = 1 | 2 | 3 | 4;

export const LEVEL_NAMES: Record<Level, string> = {
  1: "はじめて",
  2: "くりあがり",
  3: "2けた",
  4: "2けた+2けた",
};

export const QUESTIONS_PER_SESSION = 10;

function pairKey(a: number, b: number): string {
  return `${a},${b}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

function generateLevel3(): Question {
  const operandA = randomInt(10, 99);
  const operandB =
    Math.random() < 0.5 ? randomInt(1, 9) : randomInt(10, 99);
  return { operandA, operandB };
}

function generateLevel4(): Question {
  return {
    operandA: randomInt(10, 99),
    operandB: randomInt(10, 99),
  };
}

const generators: Record<Level, () => Question> = {
  1: generateLevel1,
  2: generateLevel2,
  3: generateLevel3,
  4: generateLevel4,
};

export function generateQuestions(
  level: Level,
  count = QUESTIONS_PER_SESSION,
): Question[] {
  const seen = new Set<string>();
  const questions: Question[] = [];
  let attempts = 0;
  const maxAttempts = count * 100;

  while (questions.length < count && attempts < maxAttempts) {
    attempts += 1;
    const question = generators[level]();
    const key = pairKey(question.operandA, question.operandB);
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
  return question.operandA + question.operandB;
}
