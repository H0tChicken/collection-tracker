import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, PageHeader, EmptyState } from "@/components/ui";
import { SearchInput } from "@/components/search-input";

export const dynamic = "force-dynamic";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const players = await prisma.player.findMany({
    where: q
      ? { fullName: { contains: q, mode: "insensitive" } }
      : undefined,
    include: { _count: { select: { cards: true } } },
    orderBy: { fullName: "asc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader title="Players" subtitle="Browse cards by player" />
      <div className="mb-4">
        <SearchInput placeholder="Search players…" />
      </div>
      {players.length === 0 ? (
        <EmptyState message="No players found." />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {players.map((p) => (
            <Link key={p.id} href={`/players/${p.slug}`}>
              <Card className="flex items-center justify-between transition hover:shadow-md">
                <span className="font-medium">{p.fullName}</span>
                <span className="text-xs text-foreground/50">
                  {p._count.cards} cards
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
