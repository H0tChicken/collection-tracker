import { describe, it, expect } from "vitest";
import {
  findFamilyRoots,
  decomposeCardSet,
  parsePaniniCsv,
  isPaniniCsv,
} from "@/lib/import/panini";

describe("findFamilyRoots", () => {
  it("identifies subset families, not their parallels", () => {
    const values = [
      "Base",
      "Base Black",
      "Base Optic",
      "Base Optic Gold",
      "Craftsmen",
      "Craftsmen Gold",
      "Animation",
    ];
    const roots = findFamilyRoots(values).sort();
    expect(roots).toEqual(["Animation", "Base", "Craftsmen"]);
  });
});

describe("decomposeCardSet", () => {
  const roots = ["Base", "Craftsmen", "Animation", "Rated Rookies"];

  it("maps the plain family to its base parallel", () => {
    expect(decomposeCardSet("Base", roots)).toEqual({
      subset: "",
      parallel: "Base",
    });
    expect(decomposeCardSet("Craftsmen", roots)).toEqual({
      subset: "Craftsmen",
      parallel: "Base",
    });
  });

  it("splits family + color parallel", () => {
    expect(decomposeCardSet("Base Optic Gold", roots)).toEqual({
      subset: "",
      parallel: "Optic Gold",
    });
    expect(decomposeCardSet("Craftsmen Purple", roots)).toEqual({
      subset: "Craftsmen",
      parallel: "Purple",
    });
  });

  it("prefers the longest matching root (multi-word families)", () => {
    expect(decomposeCardSet("Rated Rookies Gold", roots)).toEqual({
      subset: "Rated Rookies",
      parallel: "Gold",
    });
  });
});

describe("parsePaniniCsv", () => {
  const csv = [
    '"SPORT","YEAR","BRAND","PROGRAM","CARD SET","ATHLETE","TEAM","POSITION","CARD NUMBER","SEQUENCE"',
    '"Soccer",2025,"Donruss","Road to World Cup","Base","Lionel Messi","Argentina","F",1,',
    '"Soccer",2025,"Donruss","Road to World Cup","Base","Kylian Mbappe","France","F",2,',
    '"Soccer",2025,"Donruss","Road to World Cup","Base Optic Gold","Lionel Messi","Argentina","F",1,10',
    '"Soccer",2025,"Donruss","Road to World Cup","Base Optic Gold","Kylian Mbappe","France","F",2,10',
    '"Soccer",2025,"Donruss","Road to World Cup","Craftsmen","Pele","Brazil","F",1,',
    '"Soccer",2025,"Donruss","Road to World Cup","Craftsmen Purple","Pele","Brazil","F",1,99',
  ].join("\n");

  it("detects the format", () => {
    expect(isPaniniCsv(csv.split("\n")[0])).toBe(true);
    expect(isPaniniCsv("Card #,Player,Team")).toBe(false);
  });

  it("collapses printings into distinct cards by (subset, number)", () => {
    const r = parsePaniniCsv(csv, "COUNTRY");
    // 2 base + 1 craftsmen = 3 distinct cards
    expect(r.cards).toHaveLength(3);
    expect(r.rawRows).toBe(6);
    const base1 = r.cards.find((c) => c.subset === "" && c.cardNumber === "1");
    expect(base1?.playerName).toBe("Lionel Messi");
    expect(base1?.kitType).toBe("COUNTRY");
    expect(base1?.teamType).toBe("NATIONAL");
  });

  it("derives parallels per subset with print runs", () => {
    const r = parsePaniniCsv(csv, "COUNTRY");
    const names = r.parallels.map((p) => `${p.subset}|${p.name}|${p.printRun}`).sort();
    expect(names).toContain("|Base|null"); // base subset, base parallel, unlimited
    expect(names).toContain("|Optic Gold|10"); // base subset, /10
    expect(names).toContain("Craftsmen|Base|null");
    expect(names).toContain("Craftsmen|Purple|99");
  });
});
