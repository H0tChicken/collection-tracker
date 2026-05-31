import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, PageHeader, EmptyState } from "@/components/ui";

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
      <form className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search players…"
          className="w-full max-w-sm rounded-md border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5"
        />
      </form>
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
