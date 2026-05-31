import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSetCompletion } from "@/lib/completion";
import { Card, PageHeader, EmptyState } from "@/components/ui";
import { CompletionBar } from "@/components/completion-bar";

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
        subtitle="Track your collection against any set"
        action={
          <Link
            href="/import"
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Import a set
          </Link>
        }
      />
      {withCompletion.length === 0 ? (
        <EmptyState message="No sets yet. Import a checklist to get started." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {withCompletion.map(({ set, c }) => (
            <Link key={set.id} href={`/sets/${set.slug}`}>
              <Card className="transition hover:shadow-md">
                <div className="mb-1 font-medium">
                  {set.season ?? set.year ?? ""} {set.brand} {set.name}
                </div>
                <div className="mb-3 text-xs text-foreground/60">
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
