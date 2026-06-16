import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSetCompletion } from "@/lib/completion";
import { Card, PageHeader, EmptyState } from "@/components/ui";
import { CompletionBar } from "@/components/completion-bar";
import { setLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SetsPage() {
  const sets = await prisma.setEntity.findMany({
    include: { sport: true, manufacturer: true },
    orderBy: [{ year: "desc" }, { name: "asc" }],
  });
  const withCompletion = await Promise.all(
    sets.map(async (s) => ({ set: s, c: await getSetCompletion(s.id) })),
  );

  if (withCompletion.length === 0) {
    return (
      <div>
        <PageHeader title="Sets" subtitle="Track your collection against the bundled sets" />
        <EmptyState message="No sets loaded yet. The bundled catalog syncs on startup." />
      </div>
    );
  }

  // Group by year, descending. Sets with no year fall into a null group at the end.
  const byYear = new Map<number | null, typeof withCompletion>();
  for (const item of withCompletion) {
    const yr = item.set.year ?? null;
    if (!byYear.has(yr)) byYear.set(yr, []);
    byYear.get(yr)!.push(item);
  }
  const years = [...byYear.keys()].sort((a, b) => (b ?? -Infinity) - (a ?? -Infinity));

  return (
    <div>
      <PageHeader
        title="Sets"
        subtitle={`${sets.length} set${sets.length !== 1 ? "s" : ""} tracked`}
      />

      <div className="space-y-8">
        {years.map((yr) => (
          <section key={yr ?? "other"}>
            <h2 className="mb-3 text-label-lg font-medium uppercase tracking-widest text-on-surface-variant">
              {yr ?? "Other"}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {byYear.get(yr)!.map(({ set, c }) => (
                <Link key={set.id} href={`/sets/${set.slug}`}>
                  <Card variant="filled" interactive>
                    <div className="mb-1 font-medium">{setLabel(set)}</div>
                    <div className="mb-3 text-xs text-on-surface-variant">
                      {set.manufacturer?.name} · {set.sport.name}
                    </div>
                    <CompletionBar
                      label="Base completion"
                      owned={c.baseOwned}
                      total={c.totalCards}
                      ratio={c.baseRatio}
                    />
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
