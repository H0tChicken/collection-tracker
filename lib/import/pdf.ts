import type { ParsedChecklist } from "./types";
import { parsePdfText } from "./pdf-text";

export { parsePdfText };

/** Extract text from a PDF buffer, then parse it. Server-only. */
export async function parsePdf(buffer: Buffer): Promise<ParsedChecklist> {
  // Import the inner module (skips index.js's debug block) and keep it out of
  // the webpack bundle — pdf-parse is resolved at runtime via the Node require.
  const { default: pdfParse } = await import(
    /* webpackIgnore: true */ "pdf-parse/lib/pdf-parse.js"
  );
  const data = await pdfParse(buffer);
  return parsePdfText(data.text);
}
