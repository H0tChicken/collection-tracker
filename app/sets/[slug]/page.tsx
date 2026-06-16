import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSubsetCompletion } from "@/lib/completion";
import { Card, PageHeader, Badge, EmptyState, SegmentedButtons } from "@/components/ui";
import { CompletionBar } from "@/components/completion-bar";
import { CardParallels } from "@/components/card-parallels";
import { SearchInput } from "@/components/search-input";
import { QuickMark } from "@/components/quick-mark";
import { setLabel, compareCardNumbers } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ missing?: string; subset?: string; q?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const set = await prisma.setEntity.findUnique({
    where: { slug },
    include: { manufacturer: true, sport: true },
  });
  if (!set) notFound();

  const subsets = await getSubsetCompletion(set.id);
  // Selected subset defaults to base (""), which always exists if there are cards.
  const selected =
    sp.subset !== undefined
      ? sp.subset
      : (subsets.find((s) => s.subset === "")?.subset ?? subsets[0]?.subset ?? "");
  const showMissingOnly = sp.missing === "1";
  const q = sp.q?.trim() ?? "";

  const cardWhere: Prisma.CardWhereInput = {
    setId: set.id,
    subset: selected,
    retired: false,
  };
  if (q) {
    cardWhere.OR = [
      { cardNumber: { contains: q, mode: "insensitive" } },
      { player: { fullName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [cardsRaw, parallelHint] = await Promise.all([
    prisma.card.findMany({
      where: cardWhere,
      include: {
        player: true,
        team: true,
        items: { select: { status: true, parallelId: true, quantity: true } },
      },
    }),
    // Non-base parallels available for this subset (same for every card here).
    prisma.parallel.count({
      where: { setId: set.id, subset: selected, isBase: false },
    }),
  ]);
  // Natural sort by card number (DB string sort gives 1,10,11,2…).
  const cards = cardsRaw.sort((a, b) =>
    compareCardNumbers(a.cardNumber, b.cardNumber),
  );

  // "Missing only" = no owned/duplicate copy at any level (base or parallel).
  const visible = cards.filter((c) => {
    if (!showMissingOnly) return true;
    return !c.items.some((i) => i.status !== "WANTED");
  });

  const subsetHref = (subset: string, missing: boolean) => {
    const p = new URLSearchParams();
    p.set("subset", subset);
    if (missing) p.set("missing", "1");
    if (q) p.set("q", q);
    return `/sets/${slug}?${p.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title={setLabel(set)}
        subtitle={`${set.manufacturer?.name ?? ""} · ${set.sport.name} · ${set.totalBaseCards} base cards`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <h3 className="mb-3 text-title-sm text-on-surface">
            Subsets ({subsets.length})
          </h3>
          <div className="space-y-3">
            {subsets.map((s) => (
              <Link
                key={s.subset || "base"}
                href={subsetHref(s.subset, showMissingOnly)}
                className={
                  s.subset === selected
                    ? "block rounded-md bg-secondary-container p-2"
                    : "block rounded-md p-2 hover:bg-on-surface/[0.08]"
                }
              >
                <CompletionBar
                  label={s.label}
                  owned={s.owned}
                  total={s.totalCards}
                  ratio={s.ratio}
                />
              </Link>
            ))}
          </div>
        </Card>

        <Card className="md:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-title-sm text-on-surface">
              Checklist · {selected === "" ? "Base" : selected}
            </h3>
            <SegmentedButtons
              segments={[
                { label: "All", href: subsetHref(selected, false), selected: !showMissingOnly },
                { label: "Missing", href: subsetHref(selected, true), selected: showMissingOnly },
              ]}
            />
          </div>

          <Suspense fallback={null}>
            <SearchInput
              param="q"
              placeholder="Player or card #…"
              className="mb-3"
            />
          </Suspense>

          {visible.length === 0 ? (
            <EmptyState message={q ? `No cards match "${q}".` : "No cards to show."} />
          ) : (
            <div className="divide-y divide-outline-variant/50">
              {visible.map((c) => {
                const baseItems = c.items.filter((i) => i.parallelId === null);
                const ownedCount = baseItems
                  .filter((i) => i.status !== "WANTED")
                  .reduce((n, i) => n + i.quantity, 0);
                const isWanted = baseItems.some((i) => i.status === "WANTED");
                const parallelOwnedCount = c.items.filter(
                  (i) => i.parallelId !== null && i.status !== "WANTED",
                ).length;
                return (
                  <div key={c.id} className="flex gap-3 py-2 text-sm">
                    <span className="w-12 shrink-0 pt-0.5 font-mono text-xs text-on-surface-variant">
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
                      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant">
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
                      <CardParallels cardId={c.id} parallelHint={parallelHint} />
                    </div>
                    <QuickMark
                      cardId={c.id}
                      initialOwnedCount={ownedCount}
                      initialWanted={isWanted}
                      initialParallelOwnedCount={parallelOwnedCount}
                    />
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
