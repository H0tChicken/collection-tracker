import { describe, it, expect } from "vitest";
import { parseCsv } from "@/lib/import/csv";
import { parsePdfText } from "@/lib/import/pdf-text";
import { rowFromRecord, parseKit, parseBool } from "@/lib/import/normalize";

describe("normalize", () => {
  it("parses booleans loosely", () => {
    expect(parseBool("yes")).toBe(true);
    expect(parseBool("X")).toBe(true);
    expect(parseBool("0")).toBe(false);
    expect(parseBool(undefined)).toBe(false);
  });

  it("maps kit values", () => {
    expect(parseKit("national")).toBe("COUNTRY");
    expect(parseKit("club")).toBe("CLUB");
    expect(parseKit("n/a")).toBe("NONE");
  });

  it("requires a card number", () => {
    expect(rowFromRecord({ Player: "Messi" })).toBeNull();
    expect(rowFromRecord({ "Card #": "1", Player: "Messi" })).toMatchObject({
      cardNumber: "1",
      playerName: "Messi",
    });
  });

  it("infers country kit from a Country column", () => {
    const row = rowFromRecord({ "No.": "2", Player: "Messi", Country: "Argentina" });
    expect(row?.kitType).toBe("COUNTRY");
    expect(row?.teamType).toBe("NATIONAL");
  });
});

describe("parseCsv", () => {
  it("parses a checklist with aliased headers", () => {
    const csv = "Card #,Player,Club,Rookie\n1,Lionel Messi,Inter Miami,no\n2,Jude Bellingham,Real Madrid,yes";
    const { rows } = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      cardNumber: "2",
      playerName: "Jude Bellingham",
      isRookie: true,
      kitType: "CLUB",
    });
  });
});

describe("parsePdfText", () => {
  it("extracts card rows from messy text", () => {
    const text = [
      "Checklist",
      "1 Lionel Messi - Inter Miami",
      "RC-5 Jude Bellingham, Real Madrid",
      "Page 1",
      "garbage line without number",
    ].join("\n");
    const { rows, warnings } = parsePdfText(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ cardNumber: "1", playerName: "Lionel Messi" });
    expect(rows[1]).toMatchObject({ cardNumber: "RC-5", teamName: "Real Madrid" });
    expect(warnings.length).toBeGreaterThan(0);
  });
});
