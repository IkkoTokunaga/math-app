import type { Question } from "./db/schema";
import type { Level } from "./questions";
import { QUESTIONS_PER_SESSION } from "./questions";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hasNoBorrowTwoOperands(minuend: number, subtrahend: number): boolean {
  const maxDigits = Math.max(String(minuend).length, String(subtrahend).length);
  for (let pos = 0; pos < maxDigits; pos += 1) {
    const power = 10 ** pos;
    const minuendDigit = Math.floor(minuend / power) % 10;
    const subtrahendDigit = Math.floor(subtrahend / power) % 10;
    if (minuendDigit < subtrahendDigit) {
      return false;
    }
  }
  return true;
}

/** 各桁で繰り下がりなし（被減数から減数を順に引く） */
export function hasNoBorrow(minuend: number, ...subtrahends: number[]): boolean {
  let current = minuend;
  for (const subtrahend of subtrahends) {
    if (current < subtrahend) {
      return false;
    }
    if (!hasNoBorrowTwoOperands(current, subtrahend)) {
      return false;
    }
    current -= subtrahend;
  }
  return true;
}

export function hasBorrow(minuend: number, ...subtrahends: number[]): boolean {
  return !hasNoBorrow(minuend, ...subtrahends);
}

export function subtractionQuestionKey(question: Question): string {
  if (question.operandC != null) {
    return `${question.operandA},${question.operandB},${question.operandC}`;
  }
  return `${question.operandA},${question.operandB}`;
}

export function formatSubtractionExpression(question: Question): string {
  const parts = [question.operandA, question.operandB];
  if (question.operandC != null) {
    parts.push(question.operandC);
  }
  return parts.join(" - ");
}

export function getSubtractionCorrectAnswer(question: Question): number {
  return question.operandA - question.operandB - (question.operandC ?? 0);
}

export function getSubtractionMaxAnswerDigits(level: Level): number {
  if (level < 1 || level > 10) {
    return 3;
  }
  return 3;
}

/** 減数（operandB / operandC）に 0 を含まない */
export function hasZeroSubtrahend(question: Question): boolean {
  if (question.operandB === 0) {
    return true;
  }
  return question.operandC === 0;
}

function isValidSubtractionQuestion(question: Question): boolean {
  if (hasZeroSubtrahend(question)) {
    return false;
  }
  return getSubtractionCorrectAnswer(question) >= 0;
}

function generateLevel1(): Question {
  while (true) {
    const operandA = randomInt(1, 9);
    const operandB = randomInt(1, 9);
    if (operandA >= operandB && hasNoBorrow(operandA, operandB)) {
      return { operandA, operandB };
    }
  }
}

function generateLevel2(): Question {
  while (true) {
    const operandA = randomInt(10, 99);
    const operandB = randomInt(1, 9);
    if (operandA >= operandB && hasBorrow(operandA, operandB)) {
      return { operandA, operandB };
    }
  }
}

function generateLevel3(): Question {
  while (true) {
    const operandA = randomInt(10, 99);
    const operandB = randomInt(1, 9);
    if (operandA >= operandB && hasNoBorrow(operandA, operandB)) {
      return { operandA, operandB };
    }
  }
}

function generateTwoDigitPair(requireBorrow: boolean): Question {
  while (true) {
    const operandA = randomInt(10, 99);
    const operandB = randomInt(10, 99);
    if (operandA < operandB) {
      continue;
    }
    const borrows = hasBorrow(operandA, operandB);
    if (requireBorrow ? borrows : hasNoBorrow(operandA, operandB)) {
      return { operandA, operandB };
    }
  }
}

function generateLevel6(): Question {
  while (true) {
    const operandA = randomInt(100, 999);
    const operandB = randomInt(10, 99);
    if (operandA >= operandB && hasNoBorrow(operandA, operandB)) {
      return { operandA, operandB };
    }
  }
}

function generateLevel7(): Question {
  while (true) {
    const operandA = randomInt(10, 99);
    const operandB = randomInt(10, 99);
    const operandC = randomInt(10, 99);
    const answer = operandA - operandB - operandC;
    if (answer >= 0 && answer <= 999) {
      return { operandA, operandB, operandC };
    }
  }
}

function generateThreeDigitPair(requireBorrow: boolean): Question {
  while (true) {
    const operandA = randomInt(100, 999);
    const operandB = randomInt(100, 999);
    if (operandA < operandB) {
      continue;
    }
    const borrows = hasBorrow(operandA, operandB);
    if (requireBorrow ? borrows : hasNoBorrow(operandA, operandB)) {
      return { operandA, operandB };
    }
  }
}

function generateLevel10(): Question {
  while (true) {
    const operandA = randomInt(100, 999);
    const operandB = randomInt(100, 999);
    const operandC = randomInt(100, 999);
    const answer = operandA - operandB - operandC;
    if (answer >= 0) {
      return { operandA, operandB, operandC };
    }
  }
}

const generators: Record<Level, () => Question> = {
  1: generateLevel1,
  2: generateLevel2,
  3: generateLevel3,
  4: () => generateTwoDigitPair(false),
  5: () => generateTwoDigitPair(true),
  6: generateLevel6,
  7: generateLevel7,
  8: () => generateThreeDigitPair(false),
  9: () => generateThreeDigitPair(true),
  10: generateLevel10,
};

export function generateSubtractionQuestions(
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
    const key = subtractionQuestionKey(question);
    if (seen.has(key)) {
      continue;
    }
    if (!isValidSubtractionQuestion(question)) {
      continue;
    }
    seen.add(key);
    questions.push(question);
  }

  if (questions.length < count) {
    throw new Error(
      `Could not generate ${count} unique subtraction questions for level ${level}`,
    );
  }

  return questions;
}
