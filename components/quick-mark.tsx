"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCopy, toggleWant } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui";

export function QuickMark({
  cardId,
  initialOwnedCount,
  initialWanted,
  initialParallelOwnedCount = 0,
}: {
  cardId: string;
  initialOwnedCount: number;
  initialWanted: boolean;
  initialParallelOwnedCount?: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [owned, setOwned] = useState(initialOwnedCount);
  const [wanted, setWanted] = useState(initialWanted);
  const [parallelOwned, setParallelOwned] = useState(initialParallelOwnedCount);

  useEffect(() => { setOwned(initialOwnedCount); }, [initialOwnedCount]);
  useEffect(() => { setWanted(initialWanted); }, [initialWanted]);
  useEffect(() => { setParallelOwned(initialParallelOwnedCount); }, [initialParallelOwnedCount]);

  function have() {
    setOwned((n) => n + 1);
    start(async () => {
      await addCopy(cardId, null);
      router.refresh();
    });
  }

  function wantToggle() {
    setWanted((w) => !w);
    start(async () => {
      await toggleWant(cardId, null);
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
      {owned > 0 && <Badge tone="green">{owned} owned</Badge>}
      {parallelOwned > 0 && (
        <Badge tone="blue">+{parallelOwned} parallel{parallelOwned !== 1 ? "s" : ""}</Badge>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={have}
        className="relative overflow-hidden rounded-full bg-primary px-3 py-1 text-label-md text-on-primary hover:md-elev-1 disabled:opacity-50"
      >
        + Have
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={wantToggle}
        className={cn(
          "relative overflow-hidden rounded-full px-3 py-1 text-label-md transition-colors disabled:opacity-50",
          wanted
            ? "bg-tertiary-container text-on-tertiary-container"
            : "border border-outline text-on-surface-variant hover:bg-on-surface/[0.08]",
        )}
      >
        Want
      </button>
    </div>
  );
}
