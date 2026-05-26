import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getTimeMagicSecondsRemaining,
  getTimeMagicSecondsRemainingFromGaugeElapsed,
  getTimeMagicStartElapsed,
  shouldApplyTimeMagicPenalty,
  shouldApplyTimeMagicPenaltyFromGauge,
  TIME_MAGIC_COUNTDOWN_SECONDS,
} from "./time-attack-magic";
import { isTimeMagicLevel } from "./time-attack";

describe("time-attack-magic", () => {
  it("activates only at level 11 and above", () => {
    assert.equal(isTimeMagicLevel(10), false);
    assert.equal(isTimeMagicLevel(11), true);
  });

  it("starts countdown after bonus time expires", () => {
    const start = getTimeMagicStartElapsed(7);
    assert.equal(start, 8);
    assert.equal(getTimeMagicSecondsRemaining(start - 0.01, 7), null);
    assert.equal(getTimeMagicSecondsRemaining(start, 7), TIME_MAGIC_COUNTDOWN_SECONDS);
    assert.equal(getTimeMagicSecondsRemaining(start + 5, 7), 5);
    assert.equal(getTimeMagicSecondsRemaining(start + 10, 7), 0);
  });

  it("allows one heart penalty per question", () => {
    assert.equal(
      shouldApplyTimeMagicPenalty(11, 18, 7, undefined, 3),
      true,
    );
    assert.equal(
      shouldApplyTimeMagicPenalty(11, 18, 7, 3, 3),
      false,
    );
    assert.equal(
      shouldApplyTimeMagicPenalty(10, 18, 7, undefined, 3),
      false,
    );
  });

  it("counts down from gauge appearance, not bonus expiry", () => {
    assert.equal(getTimeMagicSecondsRemainingFromGaugeElapsed(0), 10);
    assert.equal(getTimeMagicSecondsRemainingFromGaugeElapsed(4.2), 5.8);
    assert.equal(getTimeMagicSecondsRemainingFromGaugeElapsed(10), 0);
    assert.equal(shouldApplyTimeMagicPenaltyFromGauge(11, 10, undefined, 2), true);
    assert.equal(shouldApplyTimeMagicPenaltyFromGauge(11, 9.5, undefined, 2), false);
  });
});
