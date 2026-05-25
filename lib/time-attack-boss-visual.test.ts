import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getBossImageFilter, getBossImageSrc } from "./time-attack-boss-visual";

describe("time-attack-boss-visual", () => {
  it("uses oni.png for levels 1-8 and enma.png for 9-10", () => {
    assert.equal(getBossImageSrc(1), "/oni.png");
    assert.equal(getBossImageSrc(8), "/oni.png");
    assert.equal(getBossImageSrc(9), "/enma.png");
    assert.equal(getBossImageSrc(10), "/enma.png");
  });

  it("returns distinct filters per oni level", () => {
    const filters = Array.from({ length: 8 }, (_, index) =>
      getBossImageFilter((index + 1) as 1),
    );
    assert.equal(new Set(filters).size, 8);
  });

  it("returns distinct filters for enma stages", () => {
    assert.notEqual(getBossImageFilter(9), getBossImageFilter(10));
    assert.notEqual(getBossImageFilter(8), getBossImageFilter(9));
  });
});
