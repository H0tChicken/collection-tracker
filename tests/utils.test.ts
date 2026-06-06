import { describe, it, expect } from "vitest";
import {
  setLabel,
  compareCardNumbers,
  compareParallels,
  oddsRarity,
  displayOdds,
} from "@/lib/utils";

describe("setLabel", () => {
  it("does not duplicate brand/year already in the name", () => {
    expect(
      setLabel({ name: "Topps Chrome MLS (2025)", brand: "Topps", year: 2025 }),
    ).toBe("Topps Chrome MLS (2025)");
  });

  it("prepends year and brand when absent from the name", () => {
    expect(
      setLabel({ name: "Prizm Premier League", brand: "Panini", year: 2024 }),
    ).toBe("2024 Panini Prizm Premier League");
  });

  it("prefers season over year and avoids duplicating it", () => {
    expect(
      setLabel({ name: "Merlin (25-26)", brand: "Topps", season: "25-26" }),
    ).toBe("Topps Merlin (25-26)");
    expect(
      setLabel({ name: "Donruss Road to World Cup", brand: "Donruss", year: 2025, season: "2025-26" }),
    ).toBe("2025-26 Donruss Road to World Cup");
  });

  it("handles missing brand/year", () => {
    expect(setLabel({ name: "Some Set" })).toBe("Some Set");
  });
});

describe("compareCardNumbers", () => {
  const sort = (arr: string[]) => [...arr].sort(compareCardNumbers);

  it("orders plain numbers numerically, not lexically", () => {
    expect(sort(["1", "10", "11", "2", "20", "3"])).toEqual([
      "1", "2", "3", "10", "11", "20",
    ]);
  });

  it("groups by prefix then numerically within", () => {
    expect(sort(["MG-23", "MG-3", "MG-10", "MG-2"])).toEqual([
      "MG-2", "MG-3", "MG-10", "MG-23",
    ]);
  });

  it("handles fully alphabetic codes", () => {
    expect(sort(["EKA-RON", "EKA-AG", "EKA-RL"])).toEqual([
      "EKA-AG", "EKA-RL", "EKA-RON",
    ]);
  });

  it("orders plain numbers before / after prefixed consistently", () => {
    // numeric chunk vs alpha chunk: digits sort before letters here
    const r = sort(["10", "2", "RC-1", "1"]);
    expect(r.slice(0, 3)).toEqual(["1", "2", "10"]);
    expect(r[3]).toBe("RC-1");
  });

  it("handles trailing-letter variants (100a, 100b)", () => {
    expect(sort(["100b", "100", "100a", "99"])).toEqual([
      "99", "100", "100a", "100b",
    ]);
  });
});

describe("oddsRarity", () => {
  it("parses 1:N as N packs per card", () => {
    expect(oddsRarity("1:250 hobby")).toBe(250);
    expect(oddsRarity("1:14 hobby")).toBe(14);
  });
  it("handles thousands separators", () => {
    expect(oddsRarity("1:4,098 hobby")).toBe(4098);
  });
  it("takes the easiest route across multiple figures", () => {
    expect(oddsRarity("1:6 hobby, 3:1 Mania")).toBeCloseTo(1 / 3);
  });
  it("returns null when no ratio present", () => {
    expect(oddsRarity("")).toBeNull();
    expect(oddsRarity(null)).toBeNull();
  });
});

describe("displayOdds", () => {
  it("prefers the hobby channel", () => {
    expect(displayOdds("1:4,098 hobby, 1:179 Mania, 1:14,700 value")).toBe(
      "1:4,098 hobby",
    );
  });
  it("falls back value → mania → first", () => {
    expect(displayOdds("1:35 Mania, 1:20 value")).toBe("1:20 value");
    expect(displayOdds("2:1 Mania")).toBe("2:1 Mania");
  });
  it("returns null when empty", () => {
    expect(displayOdds(null)).toBeNull();
  });
});

describe("compareParallels", () => {
  const names = (
    arr: { isBase?: boolean; name: string; printRun: number | null; odds?: string | null }[],
  ) => [...arr].sort(compareParallels).map((p) => p.name);

  it("orders by print run: unnumbered first, then high→low, 1/1 last", () => {
    const input = [
      { name: "Gold", printRun: 10 },
      { name: "Base", printRun: null, isBase: true },
      { name: "Red", printRun: 5 },
      { name: "Flash", printRun: null },
      { name: "Blue", printRun: 40 },
      { name: "Superfractor", printRun: 1 },
    ];
    expect(names(input)).toEqual([
      "Base",
      "Flash",       // unnumbered
      "Blue",        // /40
      "Gold",        // /10
      "Red",         // /5
      "Superfractor" // /1 — chase, always last
    ]);
  });

  it("ranks by print run regardless of cross-format odds (the Superfractor fix)", () => {
    // Superfractor's '1:179 Mania' must NOT make it rank above the /5.
    const input = [
      { name: "Red", printRun: 5, odds: "1:661 hobby" },
      { name: "Superfractor", printRun: 1, odds: "1:4,098 hobby, 1:179 Mania" },
      { name: "Black", printRun: 10, odds: "1:331 hobby" },
    ];
    expect(names(input)).toEqual(["Black", "Red", "Superfractor"]);
  });

  it("orders unnumbered parallels by their odds among themselves", () => {
    const input = [
      { name: "Aqua Lava", printRun: null, odds: "1:20 hobby" },
      { name: "Prism", printRun: null, odds: "1:2 value" },
      { name: "Refractors", printRun: null, odds: "1:6 hobby" },
    ];
    expect(names(input)).toEqual(["Prism", "Refractors", "Aqua Lava"]);
  });

  it("keeps Base first", () => {
    const input = [
      { name: "Silver", printRun: null },
      { name: "Base", printRun: null, isBase: true },
    ];
    expect(names(input)).toEqual(["Base", "Silver"]);
  });
});
