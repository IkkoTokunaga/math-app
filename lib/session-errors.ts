export const SESSION_NOT_FOUND_MESSAGE = "セッションが見つかりません";

export function isSessionNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.message === SESSION_NOT_FOUND_MESSAGE;
}
