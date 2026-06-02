// The on-disk shape of a compiled catalog set (catalog/dist/<externalId>.json).
// Shared between the build-time compiler and the boot-time sync. Kept dependency-
// free and plain so prisma/sync-catalog.mjs can import the JSON without TS.

export interface CatalogParallel {
  subset: string; // "" = base subset
  name: string; // "Base" for the base parallel
  printRun: number | null;
  isBase: boolean;
}

export interface CatalogCard {
  subset: string; // "" = base
  cardNumber: string;
  playerName?: string;
  teamName?: string;
  teamType?: "CLUB" | "NATIONAL";
  kitType: "CLUB" | "COUNTRY" | "NONE";
  isRookie: boolean;
  isAutograph: boolean;
  isRelic: boolean;
}

export interface CatalogSet {
  /** Compiled-format version, for forward compatibility of the sync. */
  formatVersion: 1;
  externalId: string;
  sport: string;
  name: string;
  brand: string | null;
  year: number | null;
  season: string | null;
  description: string | null;
  /** sha256 over the normalized content (cards + parallels + meta). */
  contentHash: string;
  parallels: CatalogParallel[];
  cards: CatalogCard[];
}
