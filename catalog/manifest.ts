// Declarative list of bundled sets. To add a set: drop its source file under
// catalog/sources/ and add an entry here, then run `npm run catalog:build`.
//
// `externalId` is the STABLE sync identity — never change it once shipped, or
// the boot-time sync will treat the set as new instead of updating in place.

export type CatalogKit = "CLUB" | "COUNTRY" | "NONE";

export interface CatalogSourceEntry {
  externalId: string;
  format: "PANINI_CSV";
  /** Path under catalog/sources/. */
  file: string;
  /** Kit applied to every card (e.g. COUNTRY for a World Cup product). */
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
];
