// Declarative list of bundled sets. To add a set: drop its source file under
// catalog/sources/ and add an entry here, then run `npm run catalog:build`.
//
// `externalId` is the STABLE sync identity — never change it once shipped, or
// the boot-time sync will treat the set as new instead of updating in place.

export type CatalogKit = "CLUB" | "COUNTRY" | "NONE";

export type CatalogFormat = "PANINI_CSV" | "TOPPS_XLSX";

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
