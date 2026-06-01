"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";

type Format = "JSON_TEMPLATE" | "CSV" | "XLSX" | "PDF" | "PANINI_CSV";

interface PreviewResult {
  rowCount: number;
  rows: Record<string, unknown>[];
  warnings: string[];
  counts: { rowsCreated: number; rowsUpdated: number; rowsSkipped: number };
}

export function ImportForm({ sets }: { sets: { id: string; label: string }[] }) {
  const router = useRouter();
  const [format, setFormat] = useState<Format>("JSON_TEMPLATE");
  const [setId, setSetId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [kitType, setKitType] = useState<"NONE" | "COUNTRY" | "CLUB">("NONE");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // PANINI_CSV creates its own set; only CSV/XLSX/PDF import into an existing one.
  const needsSet = format === "CSV" || format === "XLSX" || format === "PDF";
  const isPanini = format === "PANINI_CSV";

  function buildForm(action: "preview" | "commit") {
    const fd = new FormData();
    fd.set("action", action);
    fd.set("format", format);
    if (needsSet && setId) fd.set("setId", setId);
    if (file) fd.set("file", file);
    if (format === "JSON_TEMPLATE" && jsonText) fd.set("json", jsonText);
    if (isPanini) fd.set("kitType", kitType);
    return fd;
  }

  async function run(action: "preview" | "commit") {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        body: buildForm(action),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Import failed.");
        return;
      }
      if (action === "preview") {
        setPreview({
          rowCount: data.rowCount,
          rows: data.rows,
          warnings: data.warnings ?? [],
          counts: data.counts,
        });
      } else {
        router.push(data.setId ? `/sets` : "/sets");
        router.refresh();
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-foreground/60">
              Format
            </label>
            <select
              value={format}
              onChange={(e) => {
                setFormat(e.target.value as Format);
                setPreview(null);
              }}
              className="mt-1 w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5"
            >
              <option value="JSON_TEMPLATE">JSON template (creates the set)</option>
              <option value="PANINI_CSV">
                Panini/Donruss CSV (creates the set)
              </option>
              <option value="CSV">CSV (into existing set)</option>
              <option value="XLSX">Excel .xlsx (into existing set)</option>
              <option value="PDF">PDF checklist (into existing set)</option>
            </select>
          </div>

          {isPanini && (
            <div>
              <label className="block text-xs font-medium text-foreground/60">
                Kit type for all cards
              </label>
              <select
                value={kitType}
                onChange={(e) =>
                  setKitType(e.target.value as "NONE" | "COUNTRY" | "CLUB")
                }
                className="mt-1 w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5"
              >
                <option value="NONE">None / mixed</option>
                <option value="COUNTRY">Country (national-team product)</option>
                <option value="CLUB">Club</option>
              </select>
            </div>
          )}

          {needsSet && (
            <div>
              <label className="block text-xs font-medium text-foreground/60">
                Target set
              </label>
              <select
                value={setId}
                onChange={(e) => setSetId(e.target.value)}
                className="mt-1 w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5"
              >
                <option value="">Select a set…</option>
                {sets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {format === "JSON_TEMPLATE" ? (
          <div className="mt-4">
            <label className="block text-xs font-medium text-foreground/60">
              Paste JSON template (or upload a .json file below)
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={8}
              placeholder='{ "name": "...", "cards": [ ... ] }'
              className="mt-1 w-full rounded-md border border-black/15 bg-white px-3 py-2 font-mono text-xs dark:border-white/15 dark:bg-white/5"
            />
          </div>
        ) : null}

        <div className="mt-4">
          <label className="block text-xs font-medium text-foreground/60">
            File
          </label>
          <input
            type="file"
            accept={
              format === "JSON_TEMPLATE"
                ? ".json"
                : format === "CSV"
                  ? ".csv"
                  : format === "XLSX"
                    ? ".xlsx,.xls"
                    : ".pdf"
            }
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block text-sm"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => run("preview")}
            disabled={busy}
            className="rounded-md border border-black/15 px-3 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/15"
          >
            {busy ? "Working…" : "Preview"}
          </button>
          <button
            onClick={() => run("commit")}
            disabled={busy || (needsSet && !setId)}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Import
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
      </Card>

      {preview && (
        <Card>
          <h3 className="mb-2 text-sm font-semibold">
            Preview — {preview.rowCount} rows
          </h3>
          <p className="mb-3 text-xs text-foreground/60">
            {preview.counts.rowsCreated} new · {preview.counts.rowsUpdated} updated
            · {preview.counts.rowsSkipped} skipped
          </p>
          {preview.warnings.length > 0 && (
            <ul className="mb-3 list-disc pl-5 text-xs text-amber-700">
              {preview.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          <div className="max-h-80 overflow-auto rounded-md border border-black/10 dark:border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/5 dark:bg-white/10">
                <tr>
                  <th className="px-2 py-1">#</th>
                  <th className="px-2 py-1">Player</th>
                  <th className="px-2 py-1">Team</th>
                  <th className="px-2 py-1">Kit</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r, i) => (
                  <tr key={i} className="border-t border-black/5 dark:border-white/10">
                    <td className="px-2 py-1 font-mono">{String(r.cardNumber ?? "")}</td>
                    <td className="px-2 py-1">{String(r.playerName ?? "")}</td>
                    <td className="px-2 py-1">{String(r.teamName ?? "")}</td>
                    <td className="px-2 py-1">{String(r.kitType ?? "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
