import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSessionNotFoundError, SESSION_NOT_FOUND_MESSAGE } from "@/lib/session-errors";

describe("isSessionNotFoundError", () => {
  it("matches the session-not-found message", () => {
    assert.equal(isSessionNotFoundError(new Error(SESSION_NOT_FOUND_MESSAGE)), true);
  });

  it("rejects other errors", () => {
    assert.equal(isSessionNotFoundError(new Error("other")), false);
    assert.equal(isSessionNotFoundError("セッションが見つかりません"), false);
  });
});
