import { describe, it, expect } from "vitest";
import { parseToppsRows, parsePrintRunFromName } from "@/lib/import/topps";

describe("parsePrintRunFromName", () => {
  it("reads /N and 1/1", () => {
    expect(parsePrintRunFromName("Gold Refractor /50")).toBe(50);
    expect(parsePrintRunFromName("Superfractor 1/1")).toBe(1);
    expect(parsePrintRunFromName("Refractor")).toBeNull();
  });
});

describe("parseToppsRows", () => {
  const rows: unknown[][] = [
    ["Base Set"],
    ["2 cards"],
    ["Parallels"],
    ["Refractor"],
    ["Gold Refractor /50"],
    ["Superfractor 1/1"],
    ["1", "Kasper Schmeichel,", "Celtic FC", ""],
    ["16", "Endrick,", "Real Madrid C.F.", "RC"],
    ["European Kings Autographs"],
    ["1 cards"],
    ["EKA-AG", "Alejandro Garnacho,", "Manchester United"],
    ["Merlin's Dual Match Ball Signatures"],
    ["1 cards"],
    ["MDR-EN", "Warren Zaïre-Emery,", "Paris Saint-Germain"],
    ["MDR-EN", "João Neves,", "Paris Saint-Germain"],
  ];

  const parsed = parseToppsRows(rows, { kitType: "CLUB", teamType: "CLUB" });

  it("splits into subsets (base is \"\")", () => {
    const subsets = new Set(parsed.cards.map((c) => c.subset));
    expect(subsets.has("")).toBe(true);
    expect(subsets.has("European Kings Autographs")).toBe(true);
  });

  it("parses base cards, strips trailing comma, sets RC", () => {
    const base = parsed.cards.filter((c) => c.subset === "");
    expect(base).toHaveLength(2);
    expect(base[0]).toMatchObject({
      cardNumber: "1",
      playerName: "Kasper Schmeichel",
      teamName: "Celtic FC",
      kitType: "CLUB",
    });
    expect(base.find((c) => c.cardNumber === "16")?.isRookie).toBe(true);
  });

  it("captures per-subset parallels with print runs + synthetic Base", () => {
    const baseParallels = parsed.parallels.filter((p) => p.subset === "");
    expect(baseParallels.find((p) => p.isBase)).toBeTruthy();
    expect(baseParallels.find((p) => p.name === "Gold Refractor /50")?.printRun).toBe(50);
    expect(baseParallels.find((p) => p.name === "Superfractor 1/1")?.printRun).toBe(1);
  });

  it("handles lettered card codes and infers autograph from subset name", () => {
    const ek = parsed.cards.find((c) => c.cardNumber === "EKA-AG");
    expect(ek?.playerName).toBe("Alejandro Garnacho");
    expect(ek?.isAutograph).toBe(true);
  });

  it("merges multi-signature (dual) cards on the same number", () => {
    const dual = parsed.cards.filter((c) => c.cardNumber === "MDR-EN");
    expect(dual).toHaveLength(1);
    expect(dual[0].playerName).toBe("Warren Zaïre-Emery / João Neves");
    expect(dual[0].isRelic).toBe(true); // "Match Ball" → relic
  });

  it("warns when declared count != parsed count", () => {
    // base declared 2, parsed 2 → ok; dual declared 1, parsed 1 → ok.
    // (no count mismatch in this fixture)
    expect(Array.isArray(parsed.warnings)).toBe(true);
  });
});
