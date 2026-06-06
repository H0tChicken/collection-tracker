// Shared shapes for the build-time catalog parsers (Panini CSV, Topps XLSX, …).
// A parser turns a vendor file into a ParsedChecklist that the catalog compiler
// (scripts/build-catalog.ts) writes to catalog/dist as normalized JSON.

/** One distinct checklist card, identified by (subset, cardNumber). */
export interface ChecklistRow {
  cardNumber: string;
  subset?: string; // "" / undefined = base subset
  playerName?: string;
  teamName?: string;
  teamType?: "CLUB" | "NATIONAL";
  kitType?: "CLUB" | "COUNTRY" | "NONE";
  description?: string;
  isRookie?: boolean;
  isAutograph?: boolean;
  isRelic?: boolean;
}

/** A parallel definition, scoped to a subset. */
export interface ParallelDef {
  subset: string; // "" for the base subset
  name: string; // "Base" for the base parallel
  printRun: number | null; // /N (1 for 1/1); null = unlimited
  odds?: string | null; // pack odds, e.g. "1:14 hobby" (informational)
  /** True when this parallel's odds include a Mania pack channel. */
  hasMania?: boolean;
  isBase: boolean;
}

/** Which pack products a subset is available in (from its "packs." line). */
export interface SubsetAvailability {
  chrome: boolean; // hobby/value (regular Chrome)
  mania: boolean;
}

export interface ParsedChecklist {
  meta: {
    sport: string;
    year?: number;
    brand?: string;
    program?: string;
  };
  /** One row per distinct (subset, cardNumber). */
  cards: ChecklistRow[];
  /** Parallel definitions per subset, deduped. */
  parallels: ParallelDef[];
  /** subset name → which products it appears in (Topps multi-product sets). */
  subsetAvailability?: Record<string, SubsetAvailability>;
  warnings: string[];
  /** Raw rows seen in the source (for reporting). */
  rawRows: number;
}
