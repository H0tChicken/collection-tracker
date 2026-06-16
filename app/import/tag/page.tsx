"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { PageHeader, Badge, Card } from "@/components/ui";
import { previewTagImport, confirmTagImport } from "./actions";
import type { PreviewRow, PreviewStatus } from "./actions";

type Phase = "idle" | "previewing" | "done";

const STATUS_LABEL: Record<PreviewStatus, string> = {
  ok: "Will import",
  "ok-no-parallel": "Import (parallel unmatched)",
  "skip-processing-failure": "Skip — processing failure",
  "skip-dup-cert-in-file": "Skip — duplicate cert in file",
  "skip-dup-cert-in-db": "Skip — cert already in collection",
  "no-set": "Skip — set not in app",
  "no-card": "Skip — card not found",
};

const STATUS_TONE: Record<
  PreviewStatus,
  "green" | "amber" | "gray" | "blue"
> = {
  ok: "green",
  "ok-no-parallel": "amber",
  "skip-processing-failure": "gray",
  "skip-dup-cert-in-file": "gray",
  "skip-dup-cert-in-db": "gray",
  "no-set": "amber",
  "no-card": "amber",
};

function isImportable(status: PreviewStatus) {
  return status === "ok" || status === "ok-no-parallel";
}

export default function TagImportPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFile(file: File) {
    startTransition(async () => {
      const buf = await file.arrayBuffer();
      // Dynamically import xlsx so it doesn't bloat the SSR bundle.
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
      const rows = await previewTagImport(rawRows as unknown[][]);
      setPreview(rows);
      setPhase("previewing");
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      const { imported } = await confirmTagImport(preview);
      setImportedCount(imported);
      setPhase("done");
    });
  }

  const toImport = preview.filter((r) => isImportable(r.status));
  const toSkip = preview.filter((r) => !isImportable(r.status));

  // Collect unique sets that were not found in the app.
  const missingSets = [
    ...new Set(
      preview
        .filter((r) => r.status === "no-set" && r.brand)
        .map((r) => `${r.year ?? "?"} ${r.brand}`),
    ),
  ];

  return (
    <div>
      <PageHeader
        title="Import TAG Cards"
        subtitle="Bulk-import a TAG grading submission into your collection"
      />

      {phase === "idle" && (
        <Card className="max-w-md">
          <p className="mb-4 text-sm text-on-surface-variant">
            Select the TAG submission xlsx file you downloaded from the TAG
            portal. Cards will be matched to your existing checklists and added
            as TAG-graded items.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isPending}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-label-lg text-on-primary hover:md-elev-1 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {isPending ? "Reading file…" : "Choose xlsx file"}
          </button>
        </Card>
      )}

      {phase === "previewing" && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">
                <span className="text-green-600">{toImport.length}</span> will
                be imported
              </span>
              <span className="text-on-surface-variant">·</span>
              <span className="text-sm text-on-surface-variant">
                {toSkip.length} skipped
              </span>
              {missingSets.length > 0 && (
                <span className="text-sm text-amber-600">
                  · {missingSets.length} set
                  {missingSets.length !== 1 ? "s" : ""} not in app
                </span>
              )}
            </div>
            {missingSets.length > 0 && (
              <div className="mt-2 text-xs text-on-surface-variant">
                Not found:{" "}
                {missingSets.map((s, i) => (
                  <span key={s}>
                    {s}
                    {i < missingSets.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* Preview table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-left text-xs text-on-surface-variant">
                    <th className="pb-2 pr-3 font-medium">#</th>
                    <th className="pb-2 pr-3 font-medium">Player</th>
                    <th className="pb-2 pr-3 font-mono font-medium">Cert</th>
                    <th className="pb-2 pr-3 font-medium">Set matched</th>
                    <th className="pb-2 pr-3 font-mono font-medium">Card #</th>
                    <th className="pb-2 pr-3 font-medium">Parallel</th>
                    <th className="pb-2 pr-3 font-medium">Grade</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {preview.map((row) => (
                    <tr
                      key={row.certNumber}
                      className={
                        isImportable(row.status) ? "" : "opacity-50"
                      }
                    >
                      <td className="py-2 pr-3 text-xs text-on-surface-variant">
                        {row.itemNumber}
                      </td>
                      <td className="py-2 pr-3">{row.cardName}</td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {row.certNumber}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {row.matchedSetName ?? (
                          <span className="text-amber-600">
                            {row.year} {row.brand}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {row.cardNumberStr ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {row.matchedParallelName ? (
                          <Badge tone="blue">{row.matchedParallelName}</Badge>
                        ) : row.variation ? (
                          <span className="text-amber-600">{row.variation}</span>
                        ) : (
                          <span className="text-on-surface-variant">Base</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {row.numericGrade ? (
                          <Badge tone="amber">TAG {row.numericGrade}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2">
                        <Badge tone={STATUS_TONE[row.status]}>
                          {STATUS_LABEL[row.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {toImport.length > 0 && (
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="rounded-full bg-primary px-5 py-2 text-label-lg text-on-primary hover:md-elev-1 disabled:opacity-50"
              >
                {isPending
                  ? "Importing…"
                  : `Import ${toImport.length} card${toImport.length !== 1 ? "s" : ""}`}
              </button>
            )}
            <button
              onClick={() => {
                setPhase("idle");
                setPreview([]);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="rounded-full border border-outline px-5 py-2 text-label-lg text-on-surface hover:bg-on-surface/[0.08]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase === "done" && (
        <Card className="max-w-md">
          <p className="mb-4 text-sm">
            Imported <span className="font-semibold">{importedCount}</span> TAG
            card{importedCount !== 1 ? "s" : ""} into your collection.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/collection")}
              className="rounded-full bg-primary px-5 py-2 text-label-lg text-on-primary hover:md-elev-1"
            >
              View collection
            </button>
            <button
              onClick={() => {
                setPhase("idle");
                setPreview([]);
                setImportedCount(0);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="rounded-full border border-outline px-5 py-2 text-label-lg text-on-surface hover:bg-on-surface/[0.08]"
            >
              Import another
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
