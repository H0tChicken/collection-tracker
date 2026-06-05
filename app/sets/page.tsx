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

  return (
    <div>
      <PageHeader
        title="Sets"
        subtitle="Track your collection against the bundled sets"
      />
      {withCompletion.length === 0 ? (
        <EmptyState message="No sets loaded yet. The bundled catalog syncs on startup." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {withCompletion.map(({ set, c }) => (
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
      )}
    </div>
  );
}
