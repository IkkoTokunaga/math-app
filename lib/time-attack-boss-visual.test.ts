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

  it("uses enma.png for both operations at levels 9-10", () => {
    assert.equal(getBossImageSrc(9, "addition"), "/enma.png");
    assert.equal(getBossImageSrc(10, "subtraction"), "/enma.png");
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

  it("returns distinct filters for enma stages in subtraction", () => {
    assert.notEqual(getBossImageFilter(9), getBossImageFilter(10));
    assert.notEqual(getBossImageFilter(8), getBossImageFilter(9));
  });
});
