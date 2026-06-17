import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import { SearchInput } from "@/components/search-input";

export const dynamic = "force-dynamic";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const teams = await prisma.team.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    include: {
      cards: {
        where: { retired: false },
        select: {
          id: true,
          items: {
            where: { status: { in: ["OWNED", "DUPLICATE"] } },
            select: { id: true },
          },
        },
      },
    },
    orderBy: [{ teamType: "asc" }, { name: "asc" }],
  });

  const clubs = teams.filter((t) => t.teamType === "CLUB");
  const national = teams.filter((t) => t.teamType === "NATIONAL");

  function TeamCard({ t }: { t: (typeof teams)[number] }) {
    const total = t.cards.length;
    const owned = t.cards.filter((c) => c.items.length > 0).length;
    return (
      <Link href={`/teams/${t.slug}`}>
        <Card variant="filled" interactive className="flex items-center justify-between">
          <span className="font-medium">{t.name}</span>
          <span className="text-xs text-on-surface-variant">
            {owned > 0 ? (
              <><span className="text-green-600">{owned} owned</span> · {total} cards</>
            ) : (
              <>{total} cards</>
            )}
          </span>
        </Card>
      </Link>
    );
  }

  return (
    <div>
      <PageHeader title="Teams" subtitle="Browse cards by team" />
      <div className="mb-4">
        <SearchInput placeholder="Search teams…" />
      </div>
      {teams.length === 0 ? (
        <EmptyState message="No teams found." />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {clubs.length > 0 && (
            <div>
              <h3 className="mb-2 text-title-sm text-on-surface">
                <Badge tone="blue">Clubs</Badge>
              </h3>
              <div className="grid gap-2">
                {clubs.map((t) => <TeamCard key={t.id} t={t} />)}
              </div>
            </div>
          )}
          {national.length > 0 && (
            <div>
              <h3 className="mb-2 text-title-sm text-on-surface">
                <Badge tone="green">National</Badge>
              </h3>
              <div className="grid gap-2">
                {national.map((t) => <TeamCard key={t.id} t={t} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
