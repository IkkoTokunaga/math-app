import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getUnlockedLevel, isPerfectSession } from "./levels";
import type { Operation } from "./operations";

function makeSession(
  level: number,
  stars: number,
  operation: Operation = "addition",
) {
  return { level, stars, totalScore: null as number | null, operation };
}

describe("levels operation scope", () => {
  it("unlocks subtraction levels independently from addition", () => {
    const sessions = [
      makeSession(1, 5, "addition"),
      makeSession(2, 5, "addition"),
      makeSession(3, 5, "addition"),
    ];

    assert.equal(getUnlockedLevel(sessions, "addition"), 4);
    assert.equal(getUnlockedLevel(sessions, "subtraction"), 1);
  });

  it("counts perfect sessions per operation", () => {
    const sessions = [makeSession(1, 5, "subtraction")];
    assert.ok(isPerfectSession(sessions[0]));
    assert.equal(getUnlockedLevel(sessions, "subtraction"), 2);
    assert.equal(getUnlockedLevel(sessions, "addition"), 1);
  });
});
