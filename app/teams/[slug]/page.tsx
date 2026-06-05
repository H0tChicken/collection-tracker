import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import { CardParallels } from "@/components/card-parallels";
import { setLabel, compareCardNumbers } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      cards: {
        where: { retired: false },
        include: { player: true, set: true },
      },
    },
  });
  if (!team) notFound();

  // Count non-base parallels per (set, subset) so each card shows how many exist.
  const setIds = [...new Set(team.cards.map((c) => c.setId))];
  const parallels = setIds.length
    ? await prisma.parallel.findMany({
        where: { setId: { in: setIds }, isBase: false },
        select: { setId: true, subset: true },
      })
    : [];
  const parallelCount = new Map<string, number>();
  for (const p of parallels) {
    const k = `${p.setId}|${p.subset}`;
    parallelCount.set(k, (parallelCount.get(k) ?? 0) + 1);
  }

  // Group by set: newest set first, natural card-number order within each.
  type TeamCard = (typeof team.cards)[number];
  const groups: { set: TeamCard["set"]; cards: TeamCard[] }[] = [];
  const bySet = new Map<string, number>();
  for (const c of [...team.cards].sort((a, b) => {
    const yb = (b.set.year ?? 0) - (a.set.year ?? 0);
    if (yb !== 0) return yb;
    if (a.setId !== b.setId) return a.set.name.localeCompare(b.set.name);
    return compareCardNumbers(a.cardNumber, b.cardNumber);
  })) {
    let idx = bySet.get(c.setId);
    if (idx === undefined) {
      idx = groups.length;
      bySet.set(c.setId, idx);
      groups.push({ set: c.set, cards: [] });
    }
    groups[idx].cards.push(c);
  }

  return (
    <div>
      <PageHeader
        title={team.name}
        subtitle={[
          team.teamType === "CLUB" ? "Club" : "National team",
          team.league,
          team.country,
        ]
          .filter(Boolean)
          .join(" · ")}
        action={
          team.teamType === "CLUB" ? (
            <Badge tone="blue">Club</Badge>
          ) : (
            <Badge tone="green">National</Badge>
          )
        }
      />
      <Card>
        {team.cards.length === 0 ? (
          <EmptyState message="No cards for this team yet." />
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.set.id}>
                <div className="mb-1 flex items-baseline justify-between gap-2 border-b border-black/10 pb-1 dark:border-white/10">
                  <Link
                    href={`/sets/${g.set.slug}`}
                    className="truncate font-medium hover:underline"
                  >
                    {setLabel(g.set)}
                  </Link>
                  <span className="shrink-0 text-xs text-foreground/50">
                    {g.cards.length} card{g.cards.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="divide-y divide-black/5 dark:divide-white/10">
                  {g.cards.map((c) => (
                    <div key={c.id} className="flex gap-3 py-2 text-sm">
                      <span className="w-14 shrink-0 pt-0.5 font-mono text-xs text-foreground/60">
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
                          {c.subset ? (
                            <Badge tone="blue">{c.subset}</Badge>
                          ) : (
                            <span className="text-foreground/50">Base</span>
                          )}
                          {c.isRookie && <Badge tone="amber">RC</Badge>}
                          {c.isAutograph && <Badge>Auto</Badge>}
                          {c.isRelic && <Badge>Relic</Badge>}
                        </div>
                        <CardParallels
                          cardId={c.id}
                          parallelHint={
                            parallelCount.get(`${c.setId}|${c.subset}`) ?? 0
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
