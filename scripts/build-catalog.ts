/**
 * Build-time catalog compiler.
 *
 * Reads catalog/manifest.ts, runs the appropriate parser over each source file
 * under catalog/sources/, and writes a normalized, hashed JSON document per set
 * to catalog/dist/<externalId>.json. These compiled files are what the app
 * bundles and syncs into the database on boot.
 *
 * Run: `npm run catalog:build`
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { CATALOG_SOURCES } from "../catalog/manifest";
import type { CatalogCard, CatalogParallel, CatalogSet } from "../catalog/schema";
import type { ParsedChecklist } from "../lib/import/checklist";
import { parsePaniniCsv } from "../lib/import/panini";
import { parseToppsRows } from "../lib/import/topps";
import { parseToppsV2 } from "../lib/import/toppsV2";

/** Read the first worksheet of an .xlsx as an array of cell-string rows. */
function readXlsxRows(srcPath: string): unknown[][] {
  const wb = XLSX.readFile(srcPath, { cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, raw: false });
}

/** Read every worksheet of an .xlsx as { sheetName: rows }. */
function readXlsxSheets(srcPath: string): Record<string, unknown[][]> {
  const wb = XLSX.readFile(srcPath, { cellDates: false });
  const out: Record<string, unknown[][]> = {};
  for (const name of wb.SheetNames) {
    out[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], {
      header: 1,
      blankrows: false,
      raw: false,
    });
  }
  return out;
}

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCES_DIR = path.join(ROOT, "catalog", "sources");
const DIST_DIR = path.join(ROOT, "catalog", "dist");

/** Stable hash over the meaningful content (order-independent). */
function hashContent(
  meta: Record<string, unknown>,
  parallels: CatalogParallel[],
  cards: CatalogCard[],
): string {
  const norm = {
    meta,
    parallels: [...parallels].sort((a, b) =>
      `${a.subset}|${a.name}`.localeCompare(`${b.subset}|${b.name}`),
    ),
    cards: [...cards].sort((a, b) =>
      `${a.subset}|${a.cardNumber}`.localeCompare(`${b.subset}|${b.cardNumber}`),
    ),
  };
  return createHash("sha256").update(JSON.stringify(norm)).digest("hex");
}

function build() {
  mkdirSync(DIST_DIR, { recursive: true });

  // Clear stale dist files so removing a manifest entry removes its output.
  for (const f of readdirSync(DIST_DIR)) {
    if (f.endsWith(".json")) rmSync(path.join(DIST_DIR, f));
  }

  const built: string[] = [];
  for (const entry of CATALOG_SOURCES) {
    const srcPath = path.join(SOURCES_DIR, entry.file);

    let parsed: ParsedChecklist;
    if (entry.format === "PANINI_CSV") {
      parsed = parsePaniniCsv(readFileSync(srcPath, "utf8"), entry.kitType);
    } else if (entry.format === "TOPPS_XLSX") {
      const teamType = entry.kitType === "COUNTRY" ? "NATIONAL" : "CLUB";
      parsed = parseToppsRows(readXlsxRows(srcPath), {
        kitType: entry.kitType,
        teamType,
        meta: { brand: entry.brand, year: entry.year, program: entry.name },
      });
    } else if (entry.format === "TOPPS_XLSX_V2") {
      const teamType = entry.kitType === "COUNTRY" ? "NATIONAL" : "CLUB";
      parsed = parseToppsV2(readXlsxSheets(srcPath), {
        kitType: entry.kitType,
        teamType,
        meta: { brand: entry.brand, year: entry.year, program: entry.name },
      });
    } else {
      throw new Error(`Unknown format ${entry.format} for ${entry.externalId}`);
    }
    for (const w of parsed.warnings) {
      console.warn(`  ! ${entry.externalId}: ${w}`);
    }

    const allCards: CatalogCard[] = parsed.cards.map((c) => ({
      subset: c.subset ?? "",
      cardNumber: c.cardNumber,
      playerName: c.playerName,
      teamName: c.teamName,
      teamType: c.teamType,
      kitType: c.kitType ?? entry.kitType,
      isRookie: c.isRookie ?? false,
      isAutograph: c.isAutograph ?? false,
      isRelic: c.isRelic ?? false,
    }));

    // Emit a catalog set from a (possibly filtered) card + parallel subset.
    const emit = (
      out: {
        externalId: string;
        name: string;
        description: string | null;
      },
      cards: CatalogCard[],
      parallels: typeof parsed.parallels,
    ) => {
      const meta = {
        externalId: out.externalId,
        sport: parsed.meta.sport || "Soccer",
        name: out.name,
        brand: entry.brand ?? parsed.meta.brand ?? null,
        year: entry.year ?? parsed.meta.year ?? null,
        season: entry.season ?? null,
        description: out.description,
      };
      const doc: CatalogSet = {
        formatVersion: 1,
        ...meta,
        contentHash: hashContent(meta, parallels, cards),
        parallels,
        cards,
      };
      writeFileSync(
        path.join(DIST_DIR, `${out.externalId}.json`),
        JSON.stringify(doc, null, 2) + "\n",
      );
      const subsets = new Set(cards.map((c) => c.subset)).size;
      console.log(
        `✓ ${out.externalId}: ${cards.length} cards, ${subsets} subsets, ${parallels.length} parallels`,
      );
      built.push(out.externalId);
    };

    const baseName = entry.name ?? parsed.meta.program ?? entry.externalId;

    if (entry.maniaSplit) {
      // Classify subsets by availability.
      const avail = parsed.subsetAvailability ?? {};
      const maniaOnly = (s: string) =>
        s !== "" && avail[s]?.mania === true && avail[s]?.chrome === false;
      const inBoth = (s: string) =>
        s !== "" && avail[s]?.mania === true && avail[s]?.chrome === true;

      // Chrome set: everything except Mania-only subsets.
      const chromeCards = allCards.filter((c) => !maniaOnly(c.subset));
      const chromeParallels = parsed.parallels.filter(
        (p) => !maniaOnly(p.subset),
      );
      emit(
        {
          externalId: entry.externalId,
          name: baseName,
          description: entry.description ?? null,
        },
        chromeCards,
        chromeParallels,
      );

      // Mania set: Mania-only + shared subsets; parallels = base + Mania-channel.
      const inMania = (s: string) => maniaOnly(s) || inBoth(s);
      const maniaCards = allCards.filter((c) => inMania(c.subset));
      const maniaParallels = parsed.parallels.filter(
        (p) => inMania(p.subset) && (p.isBase || p.hasMania),
      );
      emit(
        {
          externalId: entry.maniaSplit.externalId,
          name: entry.maniaSplit.name,
          description: entry.maniaSplit.description ?? null,
        },
        maniaCards,
        maniaParallels,
      );
    } else {
      emit(
        {
          externalId: entry.externalId,
          name: baseName,
          description: entry.description ?? null,
        },
        allCards,
        parsed.parallels,
      );
    }
  }
  console.log(`\nBuilt ${built.length} catalog set(s) → catalog/dist/`);
}

build();
