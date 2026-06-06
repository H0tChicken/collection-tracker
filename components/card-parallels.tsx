"use client";

import { useState, useTransition } from "react";
import {
  loadCardOwnership,
  addCopy,
  toggleWant,
  updateCopy,
  removeCopy,
} from "@/lib/actions";
import { cn, formatMoney, displayOdds } from "@/lib/utils";
import { Badge } from "@/components/ui";
import { Ripple } from "@/components/ripple";

type Ownership = NonNullable<Awaited<ReturnType<typeof loadCardOwnership>>>;
type ParallelRow = Ownership["parallels"][number];
type Copy = ParallelRow["copies"][number];

const GRADERS = ["RAW", "PSA", "BGS", "SGC", "CSG", "OTHER"] as const;

function printRunLabel(printRun: number | null): string {
  if (printRun == null) return "";
  return printRun === 1 ? "1/1" : `/${printRun}`;
}

/** Inline editor for a single physical copy (grading, serial, value, storage). */
function CopyEditor({
  copy,
  storageLocations,
  onChanged,
}: {
  copy: Copy;
  storageLocations: Ownership["storageLocations"];
  onChanged: () => void;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  const summary = [
    copy.gradingCompany !== "RAW"
      ? `${copy.gradingCompany} ${copy.grade ?? ""}`.trim()
      : "Raw",
    copy.serialNumber ? `#${copy.serialNumber}` : null,
    copy.quantity > 1 ? `×${copy.quantity}` : null,
    copy.estimatedValueCents != null
      ? formatMoney(copy.estimatedValueCents)
      : null,
    copy.storageLocation?.name ?? null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="overflow-hidden rounded-md bg-surface-container">
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-body-sm">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 truncate text-left text-on-surface hover:underline"
        >
          {summary || "Raw copy"}{" "}
          <span className="text-on-surface-variant">{open ? "▲" : "▾"}</span>
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => removeCopy(copy.id).then(onChanged))}
          className="text-error hover:underline disabled:opacity-50"
        >
          Remove
        </button>
      </div>

      {open && (
        <form
          action={(fd) => start(() => updateCopy(fd).then(onChanged))}
          className="grid grid-cols-2 gap-2 border-t border-outline-variant p-3 text-body-sm"
        >
          <input type="hidden" name="id" value={copy.id} />

          <label className="flex flex-col gap-0.5">
            <span className="text-on-surface-variant">Status</span>
            <select name="status" defaultValue={copy.status} className={inputCls}>
              <option value="OWNED">Owned</option>
              <option value="DUPLICATE">Duplicate / for trade</option>
              <option value="WANTED">Wanted</option>
            </select>
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-on-surface-variant">Quantity</span>
            <input name="quantity" type="number" min={1} defaultValue={copy.quantity} className={inputCls} />
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-on-surface-variant">Grader</span>
            <select name="gradingCompany" defaultValue={copy.gradingCompany} className={inputCls}>
              {GRADERS.map((g) => (
                <option key={g} value={g}>
                  {g === "RAW" ? "Raw (ungraded)" : g}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-on-surface-variant">Grade</span>
            <input name="grade" defaultValue={copy.grade ?? ""} placeholder="9.5" className={inputCls} />
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-on-surface-variant">Cert #</span>
            <input name="certNumber" defaultValue={copy.certNumber ?? ""} className={inputCls} />
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-on-surface-variant">Serial (e.g. 23/99)</span>
            <input name="serialNumber" defaultValue={copy.serialNumber ?? ""} className={inputCls} />
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-on-surface-variant">Paid</span>
            <input
              name="purchasePrice"
              defaultValue={copy.purchasePriceCents != null ? (copy.purchasePriceCents / 100).toString() : ""}
              placeholder="$"
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-on-surface-variant">Est. value</span>
            <input
              name="estimatedValue"
              defaultValue={copy.estimatedValueCents != null ? (copy.estimatedValueCents / 100).toString() : ""}
              placeholder="$"
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-on-surface-variant">Storage</span>
            <select name="storageLocationId" defaultValue={copy.storageLocation?.id ?? ""} className={inputCls}>
              <option value="">—</option>
              {storageLocations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-on-surface-variant">Notes</span>
            <input name="notes" defaultValue={copy.notes ?? ""} className={inputCls} />
          </label>

          <div className="col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-primary px-5 py-2 text-label-lg text-on-primary hover:md-elev-1 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const inputCls =
  "rounded-sm border border-outline bg-surface px-2 py-1.5 text-on-surface focus:border-primary focus:outline-none";

function ParallelRowView({
  cardId,
  row,
  storageLocations,
  onChanged,
}: {
  cardId: string;
  row: ParallelRow;
  storageLocations: Ownership["storageLocations"];
  onChanged: () => void;
}) {
  const [pending, start] = useTransition();
  const [expanded, setExpanded] = useState(false);

  const owned = row.copies.filter((c) => c.status !== "WANTED");
  const wanted = row.copies.some((c) => c.status === "WANTED");
  const ownedQty = owned.reduce((n, c) => n + (c.quantity || 1), 0);

  return (
    <div className="border-t border-outline-variant/60 py-2 first:border-t-0">
      <div className="flex items-center gap-1.5 text-body-sm">
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <span className={cn("text-on-surface", row.isBase && "font-medium")}>
            {row.name}
          </span>
          {row.printRun != null && !/\d\/\d|\/\d/.test(row.name) && (
            <span className="text-on-surface-variant">
              {printRunLabel(row.printRun)}
            </span>
          )}
          {displayOdds(row.odds) && (
            <span className="text-body-sm text-on-surface-variant/70">
              · {displayOdds(row.odds)}
            </span>
          )}
          {ownedQty > 0 && <Badge tone="green">{ownedQty} owned</Badge>}
          {wanted && <Badge tone="amber">Want</Badge>}
        </span>

        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => addCopy(cardId, row.id).then(onChanged))}
          className="relative overflow-hidden rounded-full bg-primary px-3 py-1 text-label-md text-on-primary hover:md-elev-1 disabled:opacity-50"
        >
          + Have
          <Ripple />
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => toggleWant(cardId, row.id).then(onChanged))}
          className={cn(
            "relative overflow-hidden rounded-full px-3 py-1 text-label-md transition-colors",
            wanted
              ? "bg-tertiary-container text-on-tertiary-container"
              : "border border-outline text-on-surface-variant hover:bg-on-surface/[0.08]",
          )}
        >
          Want
          <Ripple />
        </button>
        {owned.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full px-3 py-1 text-label-md text-on-surface-variant hover:bg-on-surface/[0.08]"
          >
            {expanded ? "Hide" : `Manage (${owned.length})`}
          </button>
        )}
      </div>

      {expanded && owned.length > 0 && (
        <div className="mt-2 space-y-2 pl-2">
          {owned.map((copy) => (
            <CopyEditor
              key={copy.id}
              copy={copy}
              storageLocations={storageLocations}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CardParallels({
  cardId,
  parallelHint,
}: {
  cardId: string;
  parallelHint: number;
}) {
  const [data, setData] = useState<Ownership | null>(null);
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();

  function refresh() {
    start(async () => {
      const d = await loadCardOwnership(cardId);
      setData(d);
    });
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !data) refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className="text-label-md text-primary hover:underline"
      >
        {open ? "▲ Hide parallels" : `▾ Track parallels (${parallelHint + 1})`}
      </button>

      {open && (
        <div className="mt-2 rounded-md bg-surface-container px-3 py-1">
          {!data ? (
            <div className="py-2 text-body-sm text-on-surface-variant">Loading…</div>
          ) : (
            data.parallels.map((row) => (
              <ParallelRowView
                key={row.id ?? "base"}
                cardId={cardId}
                row={row}
                storageLocations={data.storageLocations}
                onChanged={refresh}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
