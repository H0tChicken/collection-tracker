"use client";

import { useState, useTransition } from "react";
import {
  loadCardOwnership,
  addCopy,
  toggleWant,
  updateCopy,
  removeCopy,
} from "@/lib/actions";
import { cn, formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui";

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
    <div className="rounded-md border border-black/10 dark:border-white/10">
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 truncate text-left hover:underline"
        >
          {summary || "Raw copy"} <span className="text-foreground/40">{open ? "▲" : "▾"}</span>
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => removeCopy(copy.id).then(onChanged))}
          className="text-red-600 hover:underline disabled:opacity-50"
        >
          Remove
        </button>
      </div>

      {open && (
        <form
          action={(fd) => start(() => updateCopy(fd).then(onChanged))}
          className="grid grid-cols-2 gap-2 border-t border-black/10 p-2 text-xs dark:border-white/10"
        >
          <input type="hidden" name="id" value={copy.id} />

          <label className="flex flex-col gap-0.5">
            <span className="text-foreground/50">Status</span>
            <select name="status" defaultValue={copy.status} className={inputCls}>
              <option value="OWNED">Owned</option>
              <option value="DUPLICATE">Duplicate / for trade</option>
              <option value="WANTED">Wanted</option>
            </select>
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-foreground/50">Quantity</span>
            <input name="quantity" type="number" min={1} defaultValue={copy.quantity} className={inputCls} />
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-foreground/50">Grader</span>
            <select name="gradingCompany" defaultValue={copy.gradingCompany} className={inputCls}>
              {GRADERS.map((g) => (
                <option key={g} value={g}>
                  {g === "RAW" ? "Raw (ungraded)" : g}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-foreground/50">Grade</span>
            <input name="grade" defaultValue={copy.grade ?? ""} placeholder="9.5" className={inputCls} />
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-foreground/50">Cert #</span>
            <input name="certNumber" defaultValue={copy.certNumber ?? ""} className={inputCls} />
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-foreground/50">Serial (e.g. 23/99)</span>
            <input name="serialNumber" defaultValue={copy.serialNumber ?? ""} className={inputCls} />
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-foreground/50">Paid</span>
            <input
              name="purchasePrice"
              defaultValue={copy.purchasePriceCents != null ? (copy.purchasePriceCents / 100).toString() : ""}
              placeholder="$"
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-foreground/50">Est. value</span>
            <input
              name="estimatedValue"
              defaultValue={copy.estimatedValueCents != null ? (copy.estimatedValueCents / 100).toString() : ""}
              placeholder="$"
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-foreground/50">Storage</span>
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
            <span className="text-foreground/50">Notes</span>
            <input name="notes" defaultValue={copy.notes ?? ""} className={inputCls} />
          </label>

          <div className="col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-brand-600 px-3 py-1 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
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
  "rounded border border-black/15 bg-white px-2 py-1 dark:border-white/15 dark:bg-white/5";

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
    <div className="border-t border-black/5 py-1.5 dark:border-white/10">
      <div className="flex items-center gap-2 text-xs">
        <span className="min-w-0 flex-1 truncate">
          <span className={cn(row.isBase && "font-medium")}>{row.name}</span>
          {row.printRun != null && !/\d\/\d|\/\d/.test(row.name) && (
            <span className="ml-1 text-foreground/45">{printRunLabel(row.printRun)}</span>
          )}
          {ownedQty > 0 && (
            <Badge tone="green">
              {ownedQty} owned
            </Badge>
          )}
          {wanted && <Badge tone="amber">Want</Badge>}
        </span>

        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => addCopy(cardId, row.id).then(onChanged))}
          className="rounded bg-green-600 px-2 py-0.5 font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          + Have
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => toggleWant(cardId, row.id).then(onChanged))}
          className={cn(
            "rounded px-2 py-0.5 font-medium",
            wanted ? "bg-amber-500 text-white" : "border border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10",
          )}
        >
          Want
        </button>
        {owned.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded px-2 py-0.5 text-foreground/60 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {expanded ? "Hide" : `Manage (${owned.length})`}
          </button>
        )}
      </div>

      {expanded && owned.length > 0 && (
        <div className="mt-1.5 space-y-1.5 pl-2">
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
        className="text-xs text-brand-600 hover:underline"
      >
        {open ? "▲ Hide parallels" : `▾ Track parallels (${parallelHint + 1})`}
      </button>

      {open && (
        <div className="mt-1 rounded-md bg-black/[0.02] p-2 dark:bg-white/[0.03]">
          {!data ? (
            <div className="py-2 text-xs text-foreground/50">Loading…</div>
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
