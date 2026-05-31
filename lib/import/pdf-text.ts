import type { ChecklistRow, ParsedChecklist } from "./types";

// Pure PDF-text parsing (no pdf-parse dependency), kept separate so it is
// trivially unit-testable. `pdf.ts` wraps this with the binary extractor.

// A leading card-number token: optional 1-4 letter prefix, optional dash,
// digits, optional trailing letter. e.g. "12", "RC-5", "100a", "BCP-7".
const LINE_RE = /^\s*([A-Za-z]{0,4}-?\d{1,5}[A-Za-z]?)\s+(.{2,})$/;

/** Split the remainder of a line into player + team using common separators. */
function splitPlayerTeam(rest: string): { player?: string; team?: string } {
  const sep = rest.match(/\s+[-–]\s+|,\s+|\t+/);
  if (sep && sep.index != null) {
    const player = rest.slice(0, sep.index).trim();
    const team = rest.slice(sep.index + sep[0].length).trim();
    return { player: player || undefined, team: team || undefined };
  }
  return { player: rest.trim() || undefined };
}

/** Parse raw extracted PDF text into a normalized checklist. */
export function parsePdfText(text: string): ParsedChecklist {
  const warnings: string[] = [];
  const rows: ChecklistRow[] = [];
  let skipped = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // Skip obvious headers/footers.
    if (/^(checklist|page \d+|set\b|©|copyright)/i.test(line)) continue;

    const m = line.match(LINE_RE);
    if (!m) {
      skipped++;
      continue;
    }
    const [, cardNumber, rest] = m;
    const { player, team } = splitPlayerTeam(rest);
    rows.push({ cardNumber: cardNumber.trim(), playerName: player, teamName: team });
  }

  if (skipped > 0) {
    warnings.push(
      `${skipped} line(s) did not match a card pattern and were skipped — review the preview and adjust the source if needed.`,
    );
  }
  return { rows, warnings };
}
