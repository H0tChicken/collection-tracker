// Shared types for the import subsystem. Every parser (CSV/XLSX/PDF/JSON)
// produces a list of ChecklistRow; the commit step turns those into catalog rows.

export type ImportFormat = "JSON_TEMPLATE" | "CSV" | "XLSX" | "PDF" | "MANUAL";

export interface ChecklistRow {
  cardNumber: string;
  playerName?: string;
  teamName?: string;
  teamType?: "CLUB" | "NATIONAL";
  kitType?: "CLUB" | "COUNTRY" | "NONE";
  subset?: string;
  description?: string;
  isRookie?: boolean;
  isAutograph?: boolean;
  isRelic?: boolean;
  /** Parallel names this card exists in (optional). */
  parallels?: string[];
}

export interface ParsedChecklist {
  rows: ChecklistRow[];
  /** Non-fatal warnings (e.g. skipped/ambiguous lines) surfaced in the preview. */
  warnings: string[];
}

export interface SetTemplate {
  sport?: string;
  manufacturer?: string;
  brand?: string;
  name: string;
  year?: number;
  season?: string;
  description?: string;
  parallels?: { name: string; printRun?: number; isBase?: boolean }[];
  cards: ChecklistRow[];
}

export interface CommitResult {
  rowsTotal: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsSkipped: number;
  warnings: string[];
}
