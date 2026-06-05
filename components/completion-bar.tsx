import { pct } from "@/lib/utils";
import type { ParallelProgress } from "@/lib/completion";

export function CompletionBar({
  label,
  owned,
  total,
  ratio,
}: {
  label: string;
  owned: number;
  total: number;
  ratio: number;
}) {
  const complete = ratio >= 1 && total > 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-body-sm">
        <span className="font-medium text-on-surface">{label}</span>
        <span className="text-on-surface-variant">
          {owned} / {total} ({pct(ratio)})
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-highest">
        <div
          className={complete ? "h-full rounded-full bg-tertiary" : "h-full rounded-full bg-primary"}
          style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
        />
      </div>
    </div>
  );
}

export function CompletionList({ parallels }: { parallels: ParallelProgress[] }) {
  return (
    <div className="space-y-3">
      {parallels.map((p) => (
        <CompletionBar
          key={p.parallelId ?? "base"}
          label={p.name}
          owned={p.owned}
          total={p.total}
          ratio={p.ratio}
        />
      ))}
    </div>
  );
}
