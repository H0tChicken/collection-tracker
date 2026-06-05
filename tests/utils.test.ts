import { describe, it, expect } from "vitest";
import { setLabel, compareCardNumbers } from "@/lib/utils";

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
