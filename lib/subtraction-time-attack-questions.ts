import type { Question } from "./db/schema";
import type { Level } from "./questions";
import {
  generateSubtractionQuestions,
  getSubtractionCorrectAnswer,
  hasBorrow,
  hasNoBorrow,
  hasZeroSubtrahend,
  subtractionQuestionKey,
} from "./subtraction-questions";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 一の位の借りで十の位が 0 のため百の位から借りる */
export function hasHundredsPlaceBorrow(minuend: number, subtrahend: number): boolean {
  const onesM = minuend % 10;
  const tensM = Math.floor(minuend / 10) % 10;
  const onesS = subtrahend % 10;
  const tensS = Math.floor(subtrahend / 10) % 10;

  if (onesM < onesS && tensM === 0) {
    return true;
  }

  const effectiveTensM = onesM < onesS ? tensM - 1 : tensM;
  return effectiveTensM < tensS;
}

function isValidTwoOperandQuestion(question: Question): boolean {
  if (question.operandC != null) {
    return false;
  }
  if (hasZeroSubtrahend(question)) {
    return false;
  }
  return getSubtractionCorrectAnswer(question) >= 0;
}

function generateThreeDigitMinusTwoDigitWithHundredsBorrow(): Question {
  while (true) {
    const operandA = randomInt(100, 999);
    const operandB = randomInt(10, 99);
    if (operandA < operandB) {
      continue;
    }
    if (
      hasBorrow(operandA, operandB) &&
      hasHundredsPlaceBorrow(operandA, operandB)
    ) {
      return { operandA, operandB };
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

const timeAttackGenerators: Partial<Record<Level, () => Question>> = {
  7: generateThreeDigitMinusTwoDigitWithHundredsBorrow,
  8: () => generateThreeDigitPair(false),
  9: () => generateThreeDigitPair(true),
  10: () => generateThreeDigitPair(true),
  11: () => generateThreeDigitPair(true),
};

export function getSubtractionTimeAttackMaxAnswerDigits(level: Level): number {
  void level;
  return 3;
}

export function generateSubtractionTimeAttackQuestions(
  level: Level,
  count: number,
): Question[] {
  const customGenerator = timeAttackGenerators[level];
  if (!customGenerator) {
    return generateSubtractionQuestions(level, count);
  }

  const seen = new Set<string>();
  const questions: Question[] = [];
  let attempts = 0;
  const maxAttempts = count * 200;

  while (questions.length < count && attempts < maxAttempts) {
    attempts += 1;
    const question = customGenerator();
    if (!isValidTwoOperandQuestion(question)) {
      continue;
    }
    const key = subtractionQuestionKey(question);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    questions.push(question);
  }

  if (questions.length < count) {
    throw new Error(
      `Could not generate ${count} unique subtraction time attack questions for level ${level}`,
    );
  }

  return questions;
}
