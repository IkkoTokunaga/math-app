import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getBossImageFilter,
  getBossImagePresentation,
  getBossImageSrc,
} from "./time-attack-boss-visual";

describe("time-attack-boss-visual", () => {
  it("uses oni.png for addition and oni-subtraction.png for subtraction at levels 1-8", () => {
    assert.equal(getBossImageSrc(1, "addition"), "/oni.png");
    assert.equal(getBossImageSrc(8, "addition"), "/oni.png");
    assert.equal(getBossImageSrc(1, "subtraction"), "/oni-subtraction.png");
    assert.equal(getBossImageSrc(8, "subtraction"), "/oni-subtraction.png");
  });

  it("uses enma.png at level 9 and enma-lv10.png at level 10 for both operations", () => {
    assert.equal(getBossImageSrc(9, "addition"), "/enma.png");
    assert.equal(getBossImageSrc(9, "subtraction"), "/enma.png");
    assert.equal(getBossImageSrc(10, "addition"), "/enma-lv10.png");
    assert.equal(getBossImageSrc(10, "subtraction"), "/enma-lv10.png");
  });

  it("returns CSS classes for addition oni and inline filters for subtraction", () => {
    const addition = getBossImagePresentation(3, "addition");
    assert.equal(addition.src, "/oni.png");
    assert.match(addition.className, /--addition/);
    assert.match(addition.className, /--lv3/);
    assert.equal(addition.style, undefined);

    const subtraction = getBossImagePresentation(3, "subtraction");
    assert.equal(subtraction.src, "/oni-subtraction.png");
    assert.match(subtraction.className, /--subtraction/);
    assert.ok(subtraction.style?.filter);
  });

  it("returns distinct filters per subtraction oni level", () => {
    const filters = Array.from({ length: 8 }, (_, index) =>
      getBossImageFilter((index + 1) as 1),
    );
    assert.equal(new Set(filters).size, 8);
  });

  it("uses the same CSS enma tint for subtraction and addition at levels 9-10", () => {
    const addition9 = getBossImagePresentation(9, "addition");
    const subtraction9 = getBossImagePresentation(9, "subtraction");
    assert.match(addition9.className, /--enma/);
    assert.match(subtraction9.className, /--enma/);
    assert.equal(subtraction9.style, undefined);

    const addition10 = getBossImagePresentation(10, "addition");
    const subtraction10 = getBossImagePresentation(10, "subtraction");
    assert.match(addition10.className, /--enma-black/);
    assert.match(subtraction10.className, /--enma-black/);
    assert.equal(subtraction10.style, undefined);
  });

  it("returns distinct filters per subtraction oni level only for levels 1-8", () => {
    assert.notEqual(getBossImageFilter(8), getBossImageFilter(1));
  });
});
