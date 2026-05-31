import * as XLSX from "xlsx";
import type { ParsedChecklist } from "./types";
import { rowFromRecord } from "./normalize";

/** Parse an Excel workbook (first sheet) into a normalized checklist. */
export function parseXlsx(buffer: ArrayBuffer | Buffer): ParsedChecklist {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { rows: [], warnings: ["Workbook has no sheets."] };

  const sheet = wb.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  const warnings: string[] = [];
  if (wb.SheetNames.length > 1) {
    warnings.push(
      `Workbook has ${wb.SheetNames.length} sheets; only "${sheetName}" was imported.`,
    );
  }

  const rows = [];
  let skipped = 0;
  for (const record of records) {
    const row = rowFromRecord(record);
    if (row) rows.push(row);
    else skipped++;
  }
  if (skipped > 0) warnings.push(`${skipped} row(s) skipped (no card number).`);

  return { rows, warnings };
}
