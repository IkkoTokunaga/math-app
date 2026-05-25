import type { Question } from "./db/schema";
import { formatQuestionExpression } from "./questions";
import {
  formatSubtractionExpression,
  getSubtractionCorrectAnswer,
} from "./subtraction-questions";

export type Operation = "addition" | "subtraction";

export const DEFAULT_OPERATION: Operation = "addition";

export function parseOperation(value: string | null | undefined): Operation {
  return value === "subtraction" ? "subtraction" : "addition";
}

export function formatExpression(operation: Operation, question: Question): string {
  return operation === "subtraction"
    ? formatSubtractionExpression(question)
    : formatQuestionExpression(question);
}

export function getCorrectAnswerForOperation(
  operation: Operation,
  question: Question,
): number {
  return operation === "subtraction"
    ? getSubtractionCorrectAnswer(question)
    : question.operandA + question.operandB + (question.operandC ?? 0);
}
