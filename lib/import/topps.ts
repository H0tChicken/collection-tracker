import type {
  ChecklistRow,
  ParallelDef,
  ParsedChecklist,
} from "./checklist";

// Topps "sectioned" checklist importer (e.g. Merlin UEFA Club Competitions).
//
// Unlike the Panini columnar grid, these exports are a human-readable, sectioned
// list within a single sheet. Each subset is a block:
//
//   <Subset Name>                        ← section header
//   <N> cards                            ← anchors the section; N = declared size
//   Parallels                            ← optional label
//   <Parallel Name> [/N | 1/1]           ← zero+ parallel rows (print run inline)
//   <number> | <Player,> | <Team> | <flag>   ← card rows (flag e.g. "RC")
//
// We drive a small state machine over the rows. The reliable anchor is the
// "N cards" row: the row directly above it is the subset name. After it, rows
// under a "Parallels" label (until the first card row) are parallels; remaining
// rows are cards. Card identity is (subset, cardNumber).

export interface ToppsParseOptions {
  /** Kit applied to all cards (UEFA club product → CLUB). */
  kitType?: "CLUB" | "COUNTRY" | "NONE";
  /** Team type for resolved teams (club product → CLUB). */
  teamType?: "CLUB" | "NATIONAL";
  meta?: { sport?: string; year?: number; brand?: string; program?: string };
}

const CARDS_RE = /^(\d+)\s+cards?$/i;
const AUTO_RE = /\b(autograph|signature|auto)/i;
const RELIC_RE = /\b(match ball|relic|memorabilia|patch|jersey)\b/i;
const ROOKIE_NAME_RE = /\brookie/i;

/** Parse an inline print run from a parallel name. "1/1" → 1, "/50" → 50. */
export function parsePrintRunFromName(name: string): number | null {
  const oneOfOne = name.match(/\b1\/1\b/);
  if (oneOfOne) return 1;
  const slash = name.match(/\/(\d+)\b/);
  if (slash) return Number(slash[1]);
  return null;
}

/** True when a cell value looks like a card row's number/code token.
 * Card codes are compact and space-free: plain "12", or lettered codes like
 * "S-5", "EKA-AG", "SA-PS", "MBS-LM". Section names and parallels contain
 * spaces (or the literal "Parallels"), so the no-space rule separates them. */
function looksLikeCardNumber(s: string): boolean {
  return /^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/.test(s);
}

/** Normalize a row to trimmed string cells (drop trailing empties). */
function norm(row: unknown[]): string[] {
  const cells = row.map((c) => (c == null ? "" : String(c).trim()));
  while (cells.length && cells[cells.length - 1] === "") cells.pop();
  return cells;
}

/**
 * Parse Topps sectioned rows (array of cell-arrays) into a ParsedChecklist.
 */
export function parseToppsRows(
  rawRows: unknown[][],
  opts: ToppsParseOptions = {},
): ParsedChecklist {
  const kitType = opts.kitType ?? "CLUB";
  const teamType = opts.teamType ?? (kitType === "COUNTRY" ? "NATIONAL" : "CLUB");
  const warnings: string[] = [];

  const rows = rawRows.map(norm);

  const cards: ChecklistRow[] = [];
  const parallelMap = new Map<string, ParallelDef>(); // key: `${subset}|${name}`
  const cardByKey = new Map<string, ChecklistRow>(); // `${subset}|${cardNumber}`

  let currentSubset: string | null = null; // null until first section; "" = base
  let inParallels = false;
  let sawAnyCard = false;
  let declared = 0;
  let counted = 0;
  const declaredBySubset: { subset: string; declared: number; counted: number }[] =
    [];

  const isBaseName = (n: string) => /^base set$/i.test(n) || /^base$/i.test(n);
  const subsetLabel = (n: string) => (isBaseName(n) ? "" : n);

  const flushCounts = () => {
    if (currentSubset !== null) {
      declaredBySubset.push({
        subset: currentSubset,
        declared,
        counted,
      });
    }
  };

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i];
    if (cells.length === 0) continue;
    const c0 = cells[0];

    // Section anchor: "N cards" — the previous non-empty row is the subset name.
    const cardsMatch = c0.match(CARDS_RE);
    if (cardsMatch && cells.length === 1) {
      // close out the prior subset's counts
      flushCounts();
      // find the subset name = nearest previous non-empty single-cell row
      let name = "";
      for (let j = i - 1; j >= 0; j--) {
        if (rows[j].length >= 1 && rows[j][0] !== "") {
          name = rows[j][0];
          break;
        }
      }
      currentSubset = subsetLabel(name);
      inParallels = false;
      sawAnyCard = false;
      declared = Number(cardsMatch[1]);
      counted = 0;
      continue;
    }

    if (currentSubset === null) continue; // preamble before first section

    // "Parallels" label starts the parallel list.
    if (cells.length === 1 && /^parallels$/i.test(c0)) {
      inParallels = true;
      continue;
    }

    // A card row: number in col0, player in col1.
    const maybePlayer = cells[1] ?? "";
    if (cells.length >= 2 && looksLikeCardNumber(c0) && maybePlayer !== "") {
      inParallels = false;
      sawAnyCard = true;
      const cardNumber = c0;
      // Some player-less cards (e.g. a trophy Superfractor) put the serial in
      // the player column ("MLS-1 | /1"). Don't treat a bare serial as a name.
      const rawPlayer = (cells[1] ?? "").replace(/,\s*$/, "").trim();
      const isSerialToken = /^\/?-?\d+$/.test(rawPlayer) || /^1\/1$/.test(rawPlayer);
      const playerName = isSerialToken ? undefined : rawPlayer || undefined;
      const teamName = (cells[2] ?? "").trim() || undefined;
      const flag = (cells[3] ?? "").trim();

      const subsetName = currentSubset;
      const key = `${subsetName}|${cardNumber}`;
      const existing = cardByKey.get(key);
      if (existing) {
        // Same number repeated = a multi-signature card (e.g. dual autos).
        // Merge the additional signer/team into one card rather than dropping it.
        if (playerName && !existing.playerName?.includes(playerName)) {
          existing.playerName = [existing.playerName, playerName]
            .filter(Boolean)
            .join(" / ");
        }
        if (teamName && !existing.teamName?.includes(teamName)) {
          existing.teamName = [existing.teamName, teamName]
            .filter(Boolean)
            .join(" / ");
        }
        continue;
      }
      counted++;

      const card: ChecklistRow = {
        cardNumber,
        subset: subsetName,
        playerName,
        teamName,
        teamType,
        kitType,
        isRookie: /\brc\b/i.test(flag) || ROOKIE_NAME_RE.test(subsetName),
        isAutograph: AUTO_RE.test(subsetName),
        isRelic: RELIC_RE.test(subsetName),
      };
      cardByKey.set(key, card);
      cards.push(card);
      continue;
    }

    // Otherwise, while in the parallel list and before any card, it's a parallel.
    if (inParallels && !sawAnyCard && cells.length === 1 && c0 !== "") {
      const subset = currentSubset;
      const pkey = `${subset}|${c0}`;
      if (!parallelMap.has(pkey)) {
        parallelMap.set(pkey, {
          subset,
          name: c0,
          printRun: parsePrintRunFromName(c0),
          isBase: false,
        });
      }
      continue;
    }
    // Anything else (stray notes) is ignored.
  }
  flushCounts();

  // Ensure every subset has a synthetic "Base" parallel (the card itself).
  const subsets = new Set(cards.map((c) => c.subset ?? ""));
  const parallels: ParallelDef[] = [];
  for (const s of subsets) {
    parallels.push({ subset: s, name: "Base", printRun: null, isBase: true });
    for (const p of parallelMap.values()) {
      if (p.subset === s) parallels.push(p);
    }
  }

  // Sanity warnings: declared vs counted per subset.
  for (const d of declaredBySubset) {
    if (d.declared !== d.counted) {
      warnings.push(
        `Subset "${d.subset || "Base"}": declared ${d.declared} cards but parsed ${d.counted}.`,
      );
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
    rawRows: rows.length,
  };
}
