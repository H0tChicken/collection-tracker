import Link from "next/link";
import { getDashboardStats } from "@/lib/queries";
import { getSetCompletion } from "@/lib/completion";
import { prisma } from "@/lib/db";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { CompletionBar } from "@/components/completion-bar";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const sets = await prisma.setEntity.findMany({
    orderBy: { updatedAt: "desc" },
    take: 6,
  });
  const completions = await Promise.all(
    sets.map(async (s) => ({ set: s, completion: await getSetCompletion(s.id) })),
  );

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your collection at a glance" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Cards owned" value={stats.owned} href="/collection" />
        <StatCard label="On wishlist" value={stats.wanted} href="/wishlist" />
        <StatCard label="Sets tracked" value={stats.setsTracked} href="/sets" />
        <StatCard
          label="Est. value"
          value={formatMoney(stats.estValueCents)}
        />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Sets in progress</h2>
      {completions.length === 0 ? (
        <Card>
          No sets loaded yet. The bundled catalog syncs automatically on
          startup —{" "}
          <Link href="/sets" className="text-brand-600 underline">
            browse sets
          </Link>
          .
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {completions.map(({ set, completion }) => (
            <Link key={set.id} href={`/sets/${set.slug}`}>
              <Card className="transition hover:shadow-md">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">
                    {set.season ?? set.year ?? ""} {set.brand} {set.name}
                  </span>
                </div>
                <CompletionBar
                  label="Base"
                  owned={completion.baseOwned}
                  total={completion.totalCards}
                  ratio={completion.baseRatio}
                />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
