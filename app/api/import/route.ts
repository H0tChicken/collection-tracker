import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCsv } from "@/lib/import/csv";
import { parseXlsx } from "@/lib/import/xlsx";
import { parsePdf } from "@/lib/import/pdf";
import { parseTemplate, ensureSetFromTemplate } from "@/lib/import/jsonTemplate";
import { parsePaniniCsv } from "@/lib/import/panini";
import { commitPanini } from "@/lib/import/paniniCommit";
import { commitChecklist } from "@/lib/import/commit";
import type { ChecklistRow, ParsedChecklist } from "@/lib/import/types";

export const runtime = "nodejs";

type Format = "JSON_TEMPLATE" | "CSV" | "XLSX" | "PDF" | "PANINI_CSV";

/**
 * Unified import endpoint.
 * FormData fields:
 *  - action: "preview" | "commit"
 *  - format: JSON_TEMPLATE | CSV | XLSX | PDF
 *  - setId:  required for CSV/XLSX/PDF (target set)
 *  - file:   the uploaded checklist (CSV/XLSX/PDF)
 *  - json:   raw JSON text (JSON_TEMPLATE alternative to file)
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const action = String(form.get("action") ?? "preview");
    const format = String(form.get("format") ?? "") as Format;
    const file = form.get("file") as File | null;
    const jsonText = form.get("json") ? String(form.get("json")) : null;
    let setId = form.get("setId") ? String(form.get("setId")) : null;
    let sportId: string | null = null;

    let parsed: ParsedChecklist = { rows: [], warnings: [] };

    // Panini/Donruss columnar CSV is self-contained: it creates its own set,
    // subsets and parallels. Handle it end-to-end here.
    if (format === "PANINI_CSV") {
      if (!file) return bad("No file provided.");
      const kit = (String(form.get("kitType") ?? "NONE") || "NONE") as
        | "CLUB"
        | "COUNTRY"
        | "NONE";
      const checklist = parsePaniniCsv(await file.text(), kit);
      if (checklist.cards.length === 0) {
        return bad("No cards parsed — is this a Panini/Donruss CSV export?");
      }

      if (action === "preview") {
        return NextResponse.json({
          ok: true,
          preview: true,
          rows: checklist.cards.slice(0, 50),
          rowCount: checklist.cards.length,
          warnings: [
            `${checklist.rawRows} printing rows → ${checklist.cards.length} distinct cards across ${new Set(checklist.cards.map((c) => c.subset)).size} subset(s); ${checklist.parallels.length} parallels.`,
            ...checklist.warnings,
          ],
          counts: {
            rowsCreated: checklist.cards.length,
            rowsUpdated: 0,
            rowsSkipped: 0,
          },
        });
      }

      const { result, setId: newSetId } = await commitPanini(checklist);
      await prisma.importLog.create({
        data: {
          format: "PANINI_CSV",
          status: "COMMITTED",
          sourceName: file.name,
          setId: newSetId,
          rowsTotal: result.rowsTotal,
          rowsCreated: result.rowsCreated,
          rowsUpdated: result.rowsUpdated,
          rowsSkipped: result.rowsSkipped,
          message: result.warnings.join("; ") || null,
        },
      });
      return NextResponse.json({
        ok: true,
        committed: true,
        setId: newSetId,
        result,
      });
    }

    if (format === "JSON_TEMPLATE") {
      const raw = jsonText ?? (file ? await file.text() : null);
      if (!raw) return bad("No JSON template provided.");
      const template = parseTemplate(JSON.parse(raw));
      parsed = { rows: template.cards as ChecklistRow[], warnings: [] };

      if (action === "commit") {
        const ensured = await ensureSetFromTemplate(template);
        setId = ensured.setId;
        sportId = ensured.sportId;
      }
    } else if (format === "CSV") {
      if (!file) return bad("No file provided.");
      parsed = parseCsv(await file.text());
    } else if (format === "XLSX") {
      if (!file) return bad("No file provided.");
      parsed = parseXlsx(Buffer.from(await file.arrayBuffer()));
    } else if (format === "PDF") {
      if (!file) return bad("No file provided.");
      parsed = await parsePdf(Buffer.from(await file.arrayBuffer()));
    } else {
      return bad("Unknown format.");
    }

    // For non-template formats we need a target set.
    if (format !== "JSON_TEMPLATE") {
      if (!setId) return bad("A target set is required for this format.");
      const set = await prisma.setEntity.findUnique({ where: { id: setId } });
      if (!set) return bad("Target set not found.");
      sportId = set.sportId;
    }

    if (action === "preview") {
      // Dry-run against the resolved (or, for templates, possibly-not-yet-created) set.
      let counts = { rowsCreated: parsed.rows.length, rowsUpdated: 0, rowsSkipped: 0 };
      if (setId && sportId) {
        const dry = await commitChecklist({
          setId,
          sportId,
          rows: parsed.rows,
          dryRun: true,
        });
        counts = dry;
      }
      return NextResponse.json({
        ok: true,
        preview: true,
        rows: parsed.rows.slice(0, 50),
        rowCount: parsed.rows.length,
        warnings: parsed.warnings,
        counts,
      });
    }

    // Commit
    if (!setId || !sportId) return bad("Could not resolve target set.");
    const result = await commitChecklist({
      setId,
      sportId,
      rows: parsed.rows,
    });

    await prisma.importLog.create({
      data: {
        format,
        status: "COMMITTED",
        sourceName: file?.name ?? "json",
        setId,
        rowsTotal: result.rowsTotal,
        rowsCreated: result.rowsCreated,
        rowsUpdated: result.rowsUpdated,
        rowsSkipped: result.rowsSkipped,
        message: [...parsed.warnings, ...result.warnings].join("; ") || null,
      },
    });

    return NextResponse.json({ ok: true, committed: true, setId, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}
