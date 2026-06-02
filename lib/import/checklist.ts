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
  isBase: boolean;
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
  warnings: string[];
  /** Raw rows seen in the source (for reporting). */
  rawRows: number;
}
