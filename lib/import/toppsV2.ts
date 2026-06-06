import type {
  ChecklistRow,
  ParallelDef,
  ParsedChecklist,
} from "./checklist";

// Topps multi-tab XLSX importer (e.g. 2024 Topps Chrome MLS).
//
// Layout (differs from the 2025 single-sheet TOPPS_XLSX format):
//   - Multiple sheets: Base, Autographs, Inserts, Teams, Master.
//   - "Master" is the authoritative flat card list, one row per card:
//       <subset> | <cardNumber> | <player> | <team> | <flag?> | …
//     ("Base" is the base subset; we store it as "").
//   - Each section sheet (Base/Autographs/Inserts) is split into subset blocks:
//       <Subset> Checklist        ← header (or "Base Set" for base)
//       <N> cards.
//       <odds line>
//       Parallels:
//       <Parallel Name> - /N (odds)   ← zero+ parallel rows
//       <card rows…>
//     We read the per-subset Parallels: blocks from these sheets and match them
//     to the cards by subset name. Card parsing itself uses Master (cleaner).
//
// A parallel line looks like:  "Rose Gold Refractors - /250 (1:14 hobby)"
//   name = "Rose Gold Refractors", printRun = 250, odds = "1:14 hobby"
// or unlimited:  "Refractors - (1:6 hobby, 3:1 Mania)"  → printRun null
// or 1/1:        "Superfractors - 1/1 (1:4,098 hobby)"  → printRun 1

export interface ToppsV2Options {
  kitType?: "CLUB" | "COUNTRY" | "NONE";
  teamType?: "CLUB" | "NATIONAL";
  meta?: { sport?: string; year?: number; brand?: string; program?: string };
}

const AUTO_RE = /\b(autograph|signature|auto|ink)/i;
const RELIC_RE = /\b(patch|relic|memorabilia|memory makers|debut patch)\b/i;
const ROOKIE_FLAG_RE = /^\s*(rc|rookie)\s*$/i;

function norm(rows: unknown[][]): string[][] {
  return rows.map((r) => {
    const cells = r.map((c) => (c == null ? "" : String(c).trim()));
    while (cells.length && cells[cells.length - 1] === "") cells.pop();
    return cells;
  });
}

/** Parse a "Name - /N (odds)" parallel line. */
export function parseParallelLine(
  line: string,
): { name: string; printRun: number | null; odds: string | null } | null {
  const raw = line.trim();
  if (!raw) return null;
  // Split off a trailing "(...)" odds group.
  let odds: string | null = null;
  let rest = raw;
  const oddsMatch = raw.match(/\(([^)]*)\)\s*$/);
  if (oddsMatch) {
    odds = oddsMatch[1].trim();
    rest = raw.slice(0, oddsMatch.index).trim();
  }
  // rest is like "Rose Gold Refractors - /250" or "Refractors -" or
  // "Superfractors - 1/1" or just "Prism Refractors -".
  let printRun: number | null = null;
  // Find a print run token: "/N" or "1/1".
  const pr = rest.match(/(?:^|\s)(1\/1|\/\d[\d,]*)\s*$/);
  if (pr) {
    const tok = pr[1];
    printRun = tok === "1/1" ? 1 : Number(tok.replace(/[/,]/g, ""));
    rest = rest.slice(0, pr.index).trim();
  }
  // Strip a trailing separator dash.
  const name = rest.replace(/[\s\-–—]+$/, "").trim();
  if (!name) return null;
  return { name, printRun, odds };
}

const SUBSET_LABEL = (raw: string): string => {
  const n = raw.replace(/\s+Checklist$/i, "").trim();
  return /^base set$/i.test(n) || /^base$/i.test(n) ? "" : n;
};

/** Extract per-subset parallels from a section sheet. */
function parallelsFromSection(rows: string[][]): ParallelDef[] {
  const out: ParallelDef[] = [];
  let currentSubset: string | null = null;
  let inParallels = false;

  for (let i = 0; i < rows.length; i++) {
    const c0 = (rows[i][0] ?? "").trim();
    if (!c0) continue;

    // Section header: "<X> Checklist" or the very first "Base Set".
    if (/\bChecklist$/i.test(c0) || /^base set$/i.test(c0)) {
      currentSubset = SUBSET_LABEL(c0);
      inParallels = false;
      continue;
    }
    if (/^parallels:?$/i.test(c0)) {
      inParallels = true;
      continue;
    }
    // A card row (number-ish in col0 with a player in col1) ends the parallels.
    const looksLikeCard =
      rows[i].length >= 2 &&
      /^[A-Za-z0-9][A-Za-z0-9-]*$/.test(c0) &&
      (rows[i][1] ?? "") !== "";
    if (looksLikeCard) {
      inParallels = false;
      continue;
    }
    if (inParallels && currentSubset !== null && c0.includes("-")) {
      const p = parseParallelLine(c0);
      if (p) {
        out.push({
          subset: currentSubset,
          name: p.name,
          printRun: p.printRun,
          odds: p.odds,
          isBase: false,
        });
      }
    }
  }
  return out;
}

/** Parse the Master sheet into checklist cards. */
function cardsFromMaster(
  rows: string[][],
  opts: ToppsV2Options,
): ChecklistRow[] {
  const kitType = opts.kitType ?? "CLUB";
  const teamType = opts.teamType ?? (kitType === "COUNTRY" ? "NATIONAL" : "CLUB");
  const out = new Map<string, ChecklistRow>();

  for (const cells of rows) {
    const subsetRaw = (cells[0] ?? "").trim();
    const cardNumber = (cells[1] ?? "").trim();
    const player = (cells[2] ?? "").trim();
    const team = (cells[3] ?? "").trim();
    if (!subsetRaw || !cardNumber || !player) continue;
    // header/odds rows have no numeric-ish card number in col1
    if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(cardNumber)) continue;

    const subset = SUBSET_LABEL(subsetRaw);
    // Flags can appear in col4+ ("RC", "Rookie", "- Pitch Prodigies").
    const tail = cells.slice(4).join(" ");
    const isRookie =
      ROOKIE_FLAG_RE.test(cells[4] ?? "") || /\b(rc|rookie)\b/i.test(tail);

    const key = `${subset}|${cardNumber}`;
    if (out.has(key)) {
      // Multi-signature dual: merge players/teams.
      const ex = out.get(key)!;
      if (player && !ex.playerName?.includes(player))
        ex.playerName = [ex.playerName, player].filter(Boolean).join(" / ");
      if (team && !ex.teamName?.includes(team))
        ex.teamName = [ex.teamName, team].filter(Boolean).join(" / ");
      continue;
    }
    out.set(key, {
      cardNumber,
      subset,
      playerName: player,
      teamName: team || undefined,
      teamType,
      kitType,
      isRookie,
      isAutograph: AUTO_RE.test(subsetRaw),
      isRelic: RELIC_RE.test(subsetRaw),
    });
  }
  return [...out.values()];
}

/**
 * Parse a multi-tab Topps workbook.
 * @param sheets  map of sheet name → rows (array of cell arrays)
 */
export function parseToppsV2(
  sheets: Record<string, unknown[][]>,
  opts: ToppsV2Options = {},
): ParsedChecklist {
  const warnings: string[] = [];
  // Resolve sheet names case-insensitively.
  const byName: Record<string, string[][]> = {};
  for (const [k, v] of Object.entries(sheets)) byName[k.toLowerCase()] = norm(v);

  const master = byName["master"];
  if (!master) {
    return {
      meta: { sport: opts.meta?.sport ?? "Soccer", ...opts.meta },
      cards: [],
      parallels: [],
      warnings: ["No 'Master' sheet found — cannot import."],
      rawRows: 0,
    };
  }

  const cards = cardsFromMaster(master, opts);

  // Gather parallels from the section sheets (everything except Master/Teams).
  const parallelMap = new Map<string, ParallelDef>(); // `${subset}|${name}`
  let rawRows = master.length;
  for (const [name, rows] of Object.entries(byName)) {
    if (name === "master" || name === "teams") continue;
    rawRows += rows.length;
    for (const p of parallelsFromSection(rows)) {
      const key = `${p.subset}|${p.name}`;
      if (!parallelMap.has(key)) parallelMap.set(key, p);
    }
  }

  // Every subset that has cards gets a synthetic Base parallel.
  const subsets = new Set(cards.map((c) => c.subset ?? ""));
  const parallels: ParallelDef[] = [];
  for (const s of subsets) {
    parallels.push({ subset: s, name: "Base", printRun: null, isBase: true });
    for (const p of parallelMap.values()) if (p.subset === s) parallels.push(p);
  }

  // Warn about subsets whose parallels we couldn't match.
  const subsetsWithParallels = new Set(
    [...parallelMap.values()].map((p) => p.subset),
  );
  for (const s of subsets) {
    if (s !== "" && !subsetsWithParallels.has(s)) {
      warnings.push(`Subset "${s}": no parallel block matched.`);
    }
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
    warnings,
    rawRows,
  };
}
