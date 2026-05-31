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
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-foreground/60">
          {owned} / {total} ({pct(ratio)})
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-brand-500"
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
