import { describe, it, expect } from "vitest";
import { parseParallelLine, parseToppsV2 } from "@/lib/import/toppsV2";

describe("parseParallelLine", () => {
  it("parses name, print run, and odds", () => {
    expect(parseParallelLine("Rose Gold Refractors - /250 (1:14 hobby)")).toEqual({
      name: "Rose Gold Refractors",
      printRun: 250,
      odds: "1:14 hobby",
    });
  });

  it("handles unlimited (no print run)", () => {
    expect(parseParallelLine("Refractors - (1:6 hobby, 3:1 Mania)")).toEqual({
      name: "Refractors",
      printRun: null,
      odds: "1:6 hobby, 3:1 Mania",
    });
  });

  it("parses 1/1 as print run 1", () => {
    expect(parseParallelLine("Superfractors - 1/1 (1:4,098 hobby)")).toEqual({
      name: "Superfractors",
      printRun: 1,
      odds: "1:4,098 hobby",
    });
  });

  it("strips comma thousands in print run", () => {
    expect(parseParallelLine("Foo - /1,000 (x)")?.printRun).toBe(1000);
  });
});

describe("parseToppsV2", () => {
  const sheets: Record<string, unknown[][]> = {
    Base: [
      ["Base Set"],
      ["200 cards."],
      ["Parallels:"],
      ["Refractors - (1:6 hobby)"],
      ["Gold Refractors - /50 (1:67 hobby)"],
      ["Superfractors - 1/1 (1:4,098 hobby)"],
      ["1", "Lucho Acosta", "FC Cincinnati"],
      ["Image Variations Checklist"],
      ["10 cards."],
      ["Parallels:"],
      ["Red Refractors - /5 (1:17,527 hobby)"],
      ["1", "Lucho Acosta", "FC Cincinnati"],
    ],
    Autographs: [
      ["Chrome Autographs Checklist"],
      ["91 cards."],
      ["Parallels:"],
      ["Gold Refractors - /50 (1:149 hobby)"],
      ["CA-AB", "Liel Abada", "Charlotte FC"],
    ],
    Teams: [["Atlanta United", "Base", "2", "Thiago Almada"]],
    Master: [
      ["Base", "1", "Lucho Acosta", "FC Cincinnati"],
      ["Base", "10", "Lionel Messi", "Inter Miami CF"],
      ["Image Variations", "1", "Lucho Acosta", "FC Cincinnati"],
      ["Chrome Autographs", "CA-AB", "Liel Abada", "Charlotte FC", "Rookie"],
    ],
  };

  const parsed = parseToppsV2(sheets, { kitType: "CLUB" });

  it("reads cards from the Master sheet, Base subset as ''", () => {
    expect(parsed.cards).toHaveLength(4);
    const base = parsed.cards.filter((c) => c.subset === "");
    expect(base.map((c) => c.cardNumber).sort()).toEqual(["1", "10"]);
  });

  it("infers autograph + rookie", () => {
    const ca = parsed.cards.find((c) => c.cardNumber === "CA-AB");
    expect(ca?.subset).toBe("Chrome Autographs");
    expect(ca?.isAutograph).toBe(true);
    expect(ca?.isRookie).toBe(true);
  });

  it("attaches per-subset parallels with odds", () => {
    const baseP = parsed.parallels.filter((p) => p.subset === "");
    expect(baseP.find((p) => p.isBase)).toBeTruthy();
    const gold = baseP.find((p) => p.name === "Gold Refractors");
    expect(gold?.printRun).toBe(50);
    expect(gold?.odds).toBe("1:67 hobby");
    // Image Variations has its own single parallel.
    const iv = parsed.parallels.filter((p) => p.subset === "Image Variations" && !p.isBase);
    expect(iv.map((p) => p.name)).toEqual(["Red Refractors"]);
  });

  it("does not leak parallels across subsets", () => {
    const auto = parsed.parallels.filter((p) => p.subset === "Chrome Autographs" && !p.isBase);
    expect(auto.map((p) => p.name)).toEqual(["Gold Refractors"]);
  });
});
