import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSubsetCompletion } from "@/lib/completion";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import { CompletionBar } from "@/components/completion-bar";
import { CardParallels } from "@/components/card-parallels";
import { setLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ missing?: string; subset?: string }>;
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

  const [cards, parallelHint] = await Promise.all([
    prisma.card.findMany({
      where: { setId: set.id, subset: selected, retired: false },
      include: {
        player: true,
        team: true,
        items: { select: { status: true, parallelId: true } },
      },
      orderBy: { cardNumber: "asc" },
    }),
    // Non-base parallels available for this subset (same for every card here).
    prisma.parallel.count({
      where: { setId: set.id, subset: selected, isBase: false },
    }),
  ]);

  // "Missing only" = no owned/duplicate copy at any level (base or parallel).
  const visible = cards.filter((c) => {
    if (!showMissingOnly) return true;
    return !c.items.some((i) => i.status !== "WANTED");
  });

  const subsetHref = (subset: string, missing: boolean) =>
    `/sets/${slug}?subset=${encodeURIComponent(subset)}${missing ? "&missing=1" : ""}`;

  return (
    <div>
      <PageHeader
        title={setLabel(set)}
        subtitle={`${set.manufacturer?.name ?? ""} · ${set.sport.name} · ${set.totalBaseCards} base cards`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <h3 className="mb-3 text-sm font-semibold">
            Subsets ({subsets.length})
          </h3>
          <div className="space-y-3">
            {subsets.map((s) => (
              <Link
                key={s.subset || "base"}
                href={subsetHref(s.subset, showMissingOnly)}
                className={
                  s.subset === selected
                    ? "block rounded-md bg-brand-50 p-2 dark:bg-white/10"
                    : "block rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/5"
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
            <h3 className="text-sm font-semibold">
              Checklist · {selected === "" ? "Base" : selected}
            </h3>
            <div className="flex gap-2 text-xs">
              <Link
                href={subsetHref(selected, false)}
                className={!showMissingOnly ? "font-semibold text-brand-600" : "text-foreground/60"}
              >
                All
              </Link>
              <Link
                href={subsetHref(selected, true)}
                className={showMissingOnly ? "font-semibold text-brand-600" : "text-foreground/60"}
              >
                Missing only
              </Link>
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState message="No cards to show." />
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/10">
              {visible.map((c) => (
                <div key={c.id} className="flex gap-3 py-2 text-sm">
                  <span className="w-12 shrink-0 pt-0.5 font-mono text-xs text-foreground/60">
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
                    <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-foreground/60">
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
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
