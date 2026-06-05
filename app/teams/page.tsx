import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const teams = await prisma.team.findMany({
    include: { _count: { select: { cards: true } } },
    orderBy: [{ teamType: "asc" }, { name: "asc" }],
  });
  const clubs = teams.filter((t) => t.teamType === "CLUB");
  const national = teams.filter((t) => t.teamType === "NATIONAL");

  return (
    <div>
      <PageHeader title="Teams" subtitle="Browse cards by team" />
      {teams.length === 0 ? (
        <EmptyState message="No teams yet." />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-title-sm text-on-surface">
              <Badge tone="blue">Clubs</Badge>
            </h3>
            <div className="grid gap-2">
              {clubs.map((t) => (
                <Link key={t.id} href={`/teams/${t.slug}`}>
                  <Card variant="filled" interactive className="flex items-center justify-between">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-xs text-on-surface-variant">
                      {t._count.cards}
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-title-sm text-on-surface">
              <Badge tone="green">National</Badge>
            </h3>
            <div className="grid gap-2">
              {national.map((t) => (
                <Link key={t.id} href={`/teams/${t.slug}`}>
                  <Card variant="filled" interactive className="flex items-center justify-between">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-xs text-on-surface-variant">
                      {t._count.cards}
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
