import type { ChecklistRow, ParallelDef, ParsedChecklist } from "./checklist";

// Flat-section Topps XLSX parser (e.g. 2023 Topps Finest MLS).
//
// Format (single sheet, no "N cards" anchors, no parallel blocks):
//   <SUBSET NAME>                     ← single-cell header row
//   <num> | <firstName> | <lastName> | <team> | <flag>   ← card rows
//   …
//
// firstName may be empty/null for one-name players (e.g. "Chicharito").
// flag is VETERAN | ROOKIE | RETIRED — only ROOKIE sets isRookie.
// No parallels are listed in the file; each subset gets a synthetic Base only.

export interface ToppsFlatSectionOptions {
  kitType?: "CLUB" | "COUNTRY" | "NONE";
  teamType?: "CLUB" | "NATIONAL";
  meta?: { sport?: string; year?: number; brand?: string; program?: string };
}

const AUTO_RE = /\b(autograph|signature|auto)\b/i;
const RELIC_RE = /\b(patch|relic|memorabilia)\b/i;
const CARD_NUM_RE = /^[A-Za-z0-9][A-Za-z0-9-]*$/;

function norm(row: unknown[]): string[] {
  const cells = row.map((c) => (c == null ? "" : String(c).trim()));
  while (cells.length && cells[cells.length - 1] === "") cells.pop();
  return cells;
}

export function parseToppsFlatSection(
  rawRows: unknown[][],
  opts: ToppsFlatSectionOptions = {},
): ParsedChecklist {
  const kitType = opts.kitType ?? "CLUB";
  const teamType = opts.teamType ?? (kitType === "COUNTRY" ? "NATIONAL" : "CLUB");

  const cards: ChecklistRow[] = [];
  const cardByKey = new Map<string, ChecklistRow>();
  let currentSubset: string | null = null;

  for (const rawRow of rawRows) {
    const cells = norm(rawRow);
    if (cells.length === 0) continue;
    const c0 = cells[0];

    // A row is a card if col0 looks like a card number AND there is content in
    // col1 or col2 (first or last name).
    const isCardNum = CARD_NUM_RE.test(c0);
    const hasName = (cells[1] ?? "") !== "" || (cells[2] ?? "") !== "";

    if (!isCardNum || !hasName) {
      // Section header: use it to set the current subset.
      if (c0) {
        currentSubset = /^base\s+cards?$/i.test(c0) ? "" : c0;
      }
      continue;
    }

    if (currentSubset === null) continue;

    const cardNumber = c0;
    const first = cells[1] ?? "";
    const last = cells[2] ?? "";
    const player = [first, last].filter(Boolean).join(" ") || undefined;
    const team = cells[3] || undefined;
    const flag = (cells[4] ?? "").toUpperCase();

    const key = `${currentSubset}|${cardNumber}`;
    const existing = cardByKey.get(key);
    if (existing) {
      // Dual-signature: merge names.
      if (player && !existing.playerName?.includes(player)) {
        existing.playerName = [existing.playerName, player].filter(Boolean).join(" / ");
      }
      continue;
    }

    const card: ChecklistRow = {
      cardNumber,
      subset: currentSubset,
      playerName: player,
      teamName: team,
      teamType,
      kitType,
      isRookie: flag === "ROOKIE",
      isAutograph: AUTO_RE.test(currentSubset),
      isRelic: RELIC_RE.test(currentSubset),
    };
    cardByKey.set(key, card);
    cards.push(card);
  }

  // Every subset gets a synthetic Base parallel.
  const subsets = new Set(cards.map((c) => c.subset ?? ""));
  const parallels: ParallelDef[] = [];
  for (const s of subsets) {
    parallels.push({ subset: s, name: "Base", printRun: null, isBase: true });
  }

  return {
    meta: {
      sport: opts.meta?.sport ?? "Soccer",
      year: opts.meta?.year,
      brand: opts.meta?.brand ?? "Topps",
      program: opts.meta?.program,
    },
    cards,
    parallels,
    warnings: [],
    rawRows: rawRows.length,
  };
}
