import Papa from "papaparse";
import type { ParsedChecklist } from "./types";
import { rowFromRecord } from "./normalize";

/** Parse a CSV string into a normalized checklist. */
export function parseCsv(content: string): ParsedChecklist {
  const result = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const warnings: string[] = result.errors.map(
    (e) => `Row ${e.row ?? "?"}: ${e.message}`,
  );

  const rows = [];
  let skipped = 0;
  for (const record of result.data) {
    const row = rowFromRecord(record);
    if (row) rows.push(row);
    else skipped++;
  }
  if (skipped > 0) warnings.push(`${skipped} row(s) skipped (no card number).`);

  return { rows, warnings };
}
