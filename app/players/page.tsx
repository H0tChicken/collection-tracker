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
          {players.map((p) => {
            const total = p.cards.length;
            const owned = p.cards.filter((c) => c.items.length > 0).length;
            return (
              <Link key={p.id} href={`/players/${p.slug}`}>
                <Card variant="filled" interactive className="flex items-center justify-between">
                  <span className="font-medium">{p.fullName}</span>
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
          })}
        </div>
      )}
    </div>
  );
}
