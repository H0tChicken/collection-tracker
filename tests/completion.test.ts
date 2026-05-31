import { describe, it, expect } from "vitest";
import { computeCompletion } from "@/lib/completion";

const parallels = [
  { id: "base", name: "Base", isBase: true },
  { id: "gold", name: "Gold", isBase: false },
];

describe("computeCompletion", () => {
  it("computes base completion ignoring parallels", () => {
    const r = computeCompletion(
      10,
      [
        { cardId: "a", parallelId: null, status: "OWNED" },
        { cardId: "b", parallelId: null, status: "OWNED" },
      ],
      parallels,
    );
    expect(r.baseOwned).toBe(2);
    expect(r.baseRatio).toBeCloseTo(0.2);
    expect(r.parallels[0]).toMatchObject({ name: "Base", owned: 2, total: 10 });
  });

  it("excludes WANTED items from completion", () => {
    const r = computeCompletion(
      5,
      [
        { cardId: "a", parallelId: null, status: "OWNED" },
        { cardId: "b", parallelId: null, status: "WANTED" },
      ],
      parallels,
    );
    expect(r.baseOwned).toBe(1);
  });

  it("dedupes duplicate cardIds", () => {
    const r = computeCompletion(
      5,
      [
        { cardId: "a", parallelId: null, status: "OWNED" },
        { cardId: "a", parallelId: null, status: "DUPLICATE" },
      ],
      parallels,
    );
    expect(r.baseOwned).toBe(1);
  });

  it("tracks per-parallel progress separately", () => {
    const r = computeCompletion(
      4,
      [
        { cardId: "a", parallelId: null, status: "OWNED" },
        { cardId: "a", parallelId: "gold", status: "OWNED" },
        { cardId: "b", parallelId: "gold", status: "OWNED" },
      ],
      parallels,
    );
    const gold = r.parallels.find((p) => p.parallelId === "gold");
    expect(gold?.owned).toBe(2);
    expect(r.baseOwned).toBe(1);
  });

  it("handles an empty set without dividing by zero", () => {
    const r = computeCompletion(0, [], parallels);
    expect(r.baseRatio).toBe(0);
  });
});
