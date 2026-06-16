// Parser for TAG grading submission xlsx exports.
// Pure (no DB), safe to import client- or server-side.

export interface TagRow {
  itemNumber: number;
  cardName: string;
  /** null if Processing Failure */
  grade: string | null;
  certNumber: string;
  year: number | null;
  manufacturer: string | null;
  /** BRAND column — the set name without year prefix */
  brand: string | null;
  /** CARD SET column — typically the subset name */
  cardSet: string | null;
  /** CARD NO column (stringified) */
  cardNumber: string | null;
  /** VARIATION column — parallel name */
  variation: string | null;
  isProcessingFailure: boolean;
}

export function parseTagXlsx(rawRows: unknown[][]): TagRow[] {
  const rows: TagRow[] = [];
  // Skip header row at index 0
  for (let i = 1; i < rawRows.length; i++) {
    const r = rawRows[i] as unknown[];
    if (!r || r.length === 0) continue;

    const certRaw = r[4] != null ? String(r[4]).trim() : "";
    if (!certRaw) continue;

    const gradeRaw = r[2] != null ? String(r[2]).trim() : null;
    const isProcessingFailure =
      !gradeRaw || gradeRaw.toLowerCase().includes("processing failure");

    const cardNumRaw = r[9] != null ? String(r[9]).trim() : null;

    rows.push({
      itemNumber: Number(r[0]) || i,
      cardName: r[1] != null ? String(r[1]).trim() : "",
      grade: isProcessingFailure ? null : gradeRaw,
      certNumber: certRaw,
      year: r[5] != null ? Number(r[5]) || null : null,
      manufacturer: r[6] != null ? String(r[6]).trim() || null : null,
      brand: r[7] != null ? String(r[7]).trim() || null : null,
      cardSet: r[8] != null ? String(r[8]).trim() || null : null,
      cardNumber: cardNumRaw || null,
      variation: r[10] != null ? String(r[10]).trim() || null : null,
      isProcessingFailure,
    });
  }
  return rows;
}

/** Extract leading digits from grade strings like "9 MINT" → "9", "10 GEM MINT" → "10". Returns null if no numeric prefix. */
export function extractNumericGrade(grade: string | null): string | null {
  if (!grade) return null;
  const m = grade.match(/^(\d+(?:\.\d+)?)/);
  return m ? m[1] : null;
}

/** Normalized Jaccard similarity for parallel name matching. */
export function parallelScore(a: string, b: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.replace(/s$/, ""))
      .filter(Boolean);
  const ta = normalize(a);
  const tb = normalize(b);
  const sa = new Set(ta);
  const sb = new Set(tb);
  const inter = [...sa].filter((x) => sb.has(x)).length;
  const union = new Set([...ta, ...tb]).size;
  return union === 0 ? 0 : inter / union;
}
