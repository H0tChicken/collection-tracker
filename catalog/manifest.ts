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
  format: CatalogFormat;
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
  /** TOPPS_XLSX_V2 only: also emit a companion Mania set. */
  maniaSplit?: ManiaSplit;
}

export const CATALOG_SOURCES: CatalogSourceEntry[] = [
  {
    externalId: "2025-donruss-road-to-world-cup",
    format: "PANINI_CSV",
    file: "2025-donruss-road-to-world-cup.csv",
    kitType: "COUNTRY",
    name: "Donruss Road to World Cup (25-26)",
    brand: "Donruss",
    year: 2025,
    description:
      "2025 Donruss Road to World Cup — national-team product. Compiled from the official checklist.",
  },
  {
    externalId: "2025-26-topps-merlin-uefa-club-competitions",
    format: "TOPPS_XLSX",
    file: "2025-26-topps-merlin-uefa-club-competitions.xlsx",
    kitType: "CLUB",
    name: "Topps Merlin UEFA Club Competitions (25-26)",
    brand: "Topps",
    year: 2025,
    season: "2025-26",
    description:
      "2025-26 Topps Merlin UEFA Club Competitions — club product. Compiled from the official checklist.",
  },
  {
    externalId: "2025-topps-chrome-mls",
    format: "TOPPS_XLSX",
    file: "2025-topps-chrome-mls.xlsx",
    kitType: "CLUB",
    name: "Topps Chrome MLS (2025)",
    brand: "Topps",
    year: 2025,
    description:
      "2025 Topps Chrome MLS — club product. Compiled from the official checklist.",
  },
  {
    externalId: "2024-topps-chrome-mls",
    format: "TOPPS_XLSX_V2",
    file: "2024-topps-chrome-mls.xlsx",
    kitType: "CLUB",
    name: "Topps Chrome MLS (2024)",
    brand: "Topps",
    year: 2024,
    description:
      "2024 Topps Chrome MLS — club product. Compiled from the official checklist (multi-tab workbook).",
    maniaSplit: {
      externalId: "2024-topps-chrome-mls-mania",
      name: "Topps Chrome MLS Mania (2024)",
      description:
        "2024 Topps Chrome MLS Mania — companion product. Mania-exclusive and shared subsets, Mania-channel parallels.",
    },
  },
  {
    externalId: "2025-panini-select-ligue-1",
    format: "PANINI_CSV",
    file: "2025-panini-select-ligue-1.csv",
    kitType: "CLUB",
    name: "Panini Select Ligue 1 (25-26)",
    brand: "Panini",
    year: 2025,
    season: "2025-26",
    description:
      "2025 Panini Select Ligue 1 — club product. Compiled from the official checklist.",
  },
];
