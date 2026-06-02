import { describe, it, expect } from "vitest";
import { setLabel } from "@/lib/utils";

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
