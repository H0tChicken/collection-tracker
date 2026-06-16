// Declarative list of bundled sets. To add a set: drop its source file under
// catalog/sources/ and add an entry here, then run `npm run catalog:build`.
//
// `externalId` is the STABLE sync identity — never change it once shipped, or
// the boot-time sync will treat the set as new instead of updating in place.

export type CatalogKit = "CLUB" | "COUNTRY" | "NONE";

export type CatalogFormat = "PANINI_CSV" | "TOPPS_XLSX" | "TOPPS_XLSX_V2";

/**
 * Spin a companion "Mania" set out of a TOPPS_XLSX_V2 source. Topps released
 * Chrome MLS Mania as a separate product alongside regular Chrome; this emits a
 * second catalog set containing the Mania-only + shared subsets, with parallels
 * filtered to Mania-channel only. Subsets in both products are duplicated so each
 * set tracks completely.
 */
export interface ManiaSplit {
  externalId: string;
  name: string;
  description?: string;
}

export interface CatalogSourceEntry {
  externalId: string;
  /**
   * Parser format. Optional — when omitted, the compiler auto-detects it from
   * the file: .csv → PANINI_CSV; .xlsx with a "Master" tab → TOPPS_XLSX_V2;
   * .xlsx with a "Full Checklist" tab → TOPPS_XLSX on that tab; single-sheet
   * .xlsx → TOPPS_XLSX. Set explicitly to override detection.
   */
  format?: CatalogFormat;
  /** Path under catalog/sources/. */
  file: string;
  /** Kit applied to every card (COUNTRY for national-team, CLUB for club). */
  kitType: CatalogKit;
  /** Display overrides (the parser also infers these from the file). */
  name?: string;
  brand?: string;
  year?: number;
  season?: string;
  description?: string;
  /** TOPPS_XLSX only: worksheet/tab to read (default: first sheet). */
  sheet?: string;
  /** TOPPS_XLSX_V2 only: player name is split across two columns (first, last). */
  splitPlayerName?: boolean;
  /** TOPPS_XLSX_V2 only: also emit a companion Mania set. */
  maniaSplit?: ManiaSplit;
}

export const CATALOG_SOURCES: CatalogSourceEntry[] = [
  // ── 2025 / 2025-26 ────────────────────────────────────────────────────────
  {
    externalId: "2025-topps-chrome-mls",
    format: "TOPPS_XLSX",
    file: "2025-topps-chrome-mls.xlsx",
    kitType: "CLUB",
    name: "Topps Chrome MLS",
    brand: "Topps",
    year: 2025,
  },
  {
    externalId: "2025-topps-chrome-sapphire-mls",
    format: "TOPPS_XLSX",
    file: "2025-topps-chrome-sapphire-mls.xlsx",
    sheet: "Full Checklist",
    kitType: "CLUB",
    name: "Topps Chrome Sapphire Edition MLS",
    brand: "Topps",
    year: 2025,
  },
  {
    externalId: "2025-26-topps-merlin-uefa-club-competitions",
    format: "TOPPS_XLSX",
    file: "2025-26-topps-merlin-uefa-club-competitions.xlsx",
    kitType: "CLUB",
    name: "Topps Merlin UEFA Club Competitions",
    brand: "Topps",
    year: 2025,
    season: "2025-26",
  },
  {
    externalId: "2025-panini-select-ligue-1",
    format: "PANINI_CSV",
    file: "2025-panini-select-ligue-1.csv",
    kitType: "CLUB",
    name: "Panini Select Ligue 1",
    brand: "Panini",
    year: 2025,
    season: "2025-26",
  },
  {
    externalId: "2025-donruss-road-to-world-cup",
    format: "PANINI_CSV",
    file: "2025-donruss-road-to-world-cup.csv",
    kitType: "COUNTRY",
    name: "Donruss Road to World Cup",
    brand: "Donruss",
    year: 2025,
    season: "2025-26",
  },
  // ── 2024 ──────────────────────────────────────────────────────────────────
  {
    externalId: "2024-topps-chrome-mls",
    format: "TOPPS_XLSX_V2",
    file: "2024-topps-chrome-mls.xlsx",
    kitType: "CLUB",
    name: "Topps Chrome MLS",
    brand: "Topps",
    year: 2024,
    maniaSplit: {
      externalId: "2024-topps-chrome-mls-mania",
      name: "Topps Chrome MLS Mania",
    },
  },
  {
    externalId: "2024-topps-chrome-sapphire-mls",
    file: "2024-topps-chrome-sapphire-mls.xlsx",
    kitType: "CLUB",
    name: "Topps Chrome Sapphire Edition MLS",
    brand: "Topps",
    year: 2024,
  },
  {
    externalId: "2024-topps-finest-mls",
    file: "2024-topps-finest-mls.xlsx",
    kitType: "CLUB",
    name: "Topps Finest MLS",
    brand: "Topps",
    year: 2024,
  },
  {
    externalId: "2024-topps-superstars-mls",
    file: "2024-topps-superstars-mls.xlsx",
    kitType: "CLUB",
    name: "Topps MLS Superstars",
    brand: "Topps",
    year: 2024,
  },
  // ── 2023-24 ───────────────────────────────────────────────────────────────
  {
    externalId: "2023-24-topps-chrome-womens-ucl",
    file: "2023-24-topps-chrome-womens-ucl.xlsx",
    kitType: "CLUB",
    splitPlayerName: true,
    name: "Topps Chrome UEFA Women's Champions League",
    brand: "Topps",
    year: 2023,
    season: "2023-24",
  },
];
