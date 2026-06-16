"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCopy, removeCopy } from "@/lib/actions";

const GRADERS = ["RAW", "PSA", "BGS", "SGC", "CSG", "TAG", "OTHER"] as const;

const inputCls =
  "rounded-sm border border-outline bg-surface px-2 py-1.5 text-on-surface focus:border-primary focus:outline-none";

type Item = {
  id: string;
  status: "OWNED" | "WANTED" | "DUPLICATE";
  quantity: number;
  gradingCompany: string;
  grade: string | null;
  certNumber: string | null;
  serialNumber: string | null;
  notes: string | null;
  storageLocation: { id: string; name: string } | null;
};

type StorageLocation = { id: string; name: string };

export function CollectionItemEditor({
  item,
  storageLocations,
}: {
  item: Item;
  storageLocations: StorageLocation[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  function handleRemove() {
    if (!confirm("Remove this item from your collection?")) return;
    start(async () => {
      await removeCopy(item.id);
      router.refresh();
    });
  }

  return (
    <div className="mt-1">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-label-md text-primary hover:underline"
        >
          {open ? "▲ Close" : "▾ Edit"}
        </button>
        {open && (
          <button
            type="button"
            disabled={pending}
            onClick={handleRemove}
            className="text-label-md text-error hover:underline disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>

      {open && (
        <form
          key={`${item.gradingCompany}-${item.grade ?? ""}-${item.status}-${item.certNumber ?? ""}-${item.serialNumber ?? ""}`}
          action={(fd) =>
            start(async () => {
              await updateCopy(fd);
              router.refresh();
            })
          }
          className="mt-2 grid grid-cols-2 gap-2 rounded-md border border-outline-variant bg-surface-container p-3 text-body-sm"
        >
          <input type="hidden" name="id" value={item.id} />

          <label className="flex flex-col gap-0.5">
            <span className="text-on-surface-variant">Status</span>
            <select name="status" defaultValue={item.status} className={inputCls}>
              <option value="OWNED">Owned</option>
              <option value="DUPLICATE">Duplicate / for trade</option>
              <option value="WANTED">Wanted</option>
            </select>
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-on-surface-variant">Quantity</span>
            <input
              name="quantity"
              type="number"
              min={1}
              defaultValue={item.quantity}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-on-surface-variant">Grader</span>
            <select
              name="gradingCompany"
              defaultValue={item.gradingCompany}
              className={inputCls}
            >
              {GRADERS.map((g) => (
                <option key={g} value={g}>
                  {g === "RAW" ? "Raw (ungraded)" : g}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-on-surface-variant">Grade</span>
            <input
              name="grade"
              defaultValue={item.grade ?? ""}
              placeholder="9.5"
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-on-surface-variant">Cert #</span>
            <input
              name="certNumber"
              defaultValue={item.certNumber ?? ""}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-on-surface-variant">Serial (e.g. 23/99)</span>
            <input
              name="serialNumber"
              defaultValue={item.serialNumber ?? ""}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-on-surface-variant">Storage</span>
            <select
              name="storageLocationId"
              defaultValue={item.storageLocation?.id ?? ""}
              className={inputCls}
            >
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
            <input
              name="notes"
              defaultValue={item.notes ?? ""}
              className={inputCls}
            />
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
