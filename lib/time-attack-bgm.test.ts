import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  shuffleTracks,
  TimeAttackBgmQueue,
  TIME_ATTACK_BGM_TRACKS,
} from "./time-attack-bgm.ts";

describe("time-attack-bgm queue", () => {
  it("plays every track once before repeating", () => {
    const queue = new TimeAttackBgmQueue(TIME_ATTACK_BGM_TRACKS);
    const seen = new Set<string>();

    for (let index = 0; index < TIME_ATTACK_BGM_TRACKS.length; index += 1) {
      const track = queue.next();
      assert.equal(seen.has(track), false);
      seen.add(track);
    }

    assert.equal(seen.size, TIME_ATTACK_BGM_TRACKS.length);
  });

  it("does not repeat the current track when starting a new cycle", () => {
    const queue = new TimeAttackBgmQueue(TIME_ATTACK_BGM_TRACKS);
    let current: string | null = null;

    for (let cycle = 0; cycle < 5; cycle += 1) {
      for (let index = 0; index < TIME_ATTACK_BGM_TRACKS.length; index += 1) {
        const next = queue.next(current);
        if (current != null) {
          assert.notEqual(next, current);
        }
        current = next;
      }
    }
  });

  it("restores remaining tracks from saved queue", () => {
    const queue = new TimeAttackBgmQueue(["a", "b", "c"], ["b", "c"]);

    assert.equal(queue.next(), "b");
    assert.equal(queue.next(), "c");
    assert.equal(queue.getRemaining().length, 0);

    const third = queue.next("c");
    assert.notEqual(third, "c");
    assert.equal(new Set(["a", "b", "c"]).has(third), true);
  });
});
