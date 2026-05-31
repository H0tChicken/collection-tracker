import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSetCompletion } from "@/lib/completion";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import { CompletionList } from "@/components/completion-bar";
import { CardStatusToggle } from "@/components/card-status-toggle";

export const dynamic = "force-dynamic";

export default async function SetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ missing?: string }>;
}) {
  const { slug } = await params;
  const { missing } = await searchParams;
  const set = await prisma.setEntity.findUnique({
    where: { slug },
    include: {
      manufacturer: true,
      sport: true,
      cards: {
        include: {
          player: true,
          team: true,
          items: { select: { status: true, parallelId: true } },
        },
        orderBy: { cardNumber: "asc" },
      },
    },
  });
  if (!set) notFound();

  const completion = await getSetCompletion(set.id);
  const showMissingOnly = missing === "1";

  const cards = set.cards.filter((c) => {
    if (!showMissingOnly) return true;
    return !c.items.some((i) => i.parallelId === null && i.status !== "WANTED");
  });

  return (
    <div>
      <PageHeader
        title={`${set.season ?? set.year ?? ""} ${set.brand ?? ""} ${set.name}`.trim()}
        subtitle={`${set.manufacturer?.name ?? ""} · ${set.sport.name} · ${set.totalBaseCards} cards`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <h3 className="mb-3 text-sm font-semibold">Completion</h3>
          <CompletionList parallels={completion.parallels} />
        </Card>

        <Card className="md:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Checklist</h3>
            <div className="flex gap-2 text-xs">
              <Link
                href={`/sets/${slug}`}
                className={!showMissingOnly ? "font-semibold text-brand-600" : "text-foreground/60"}
              >
                All
              </Link>
              <Link
                href={`/sets/${slug}?missing=1`}
                className={showMissingOnly ? "font-semibold text-brand-600" : "text-foreground/60"}
              >
                Missing only
              </Link>
            </div>
          </div>

          {cards.length === 0 ? (
            <EmptyState message="No cards to show." />
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/10">
              {cards.map((c) => {
                const baseItem = c.items.find((i) => i.parallelId === null);
                const status = (baseItem?.status ?? "NONE") as
                  | "OWNED"
                  | "WANTED"
                  | "DUPLICATE"
                  | "NONE";
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 py-2 text-sm"
                  >
                    <span className="w-12 shrink-0 font-mono text-xs text-foreground/60">
                      {c.cardNumber}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {c.player ? (
                          <Link
                            href={`/players/${c.player.slug}`}
                            className="hover:underline"
                          >
                            {c.player.fullName}
                          </Link>
                        ) : (
                          c.description ?? "—"
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-foreground/60">
                        {c.team && (
                          <Link href={`/teams/${c.team.slug}`} className="hover:underline">
                            {c.team.name}
                          </Link>
                        )}
                        {c.kitType === "CLUB" && <Badge tone="blue">Club</Badge>}
                        {c.kitType === "COUNTRY" && (
                          <Badge tone="green">Country</Badge>
                        )}
                        {c.isRookie && <Badge tone="amber">RC</Badge>}
                        {c.isAutograph && <Badge>Auto</Badge>}
                        {c.isRelic && <Badge>Relic</Badge>}
                      </div>
                    </div>
                    <CardStatusToggle cardId={c.id} current={status} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
