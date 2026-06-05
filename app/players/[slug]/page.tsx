import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayerWithCards } from "@/lib/queries";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import { CardParallels } from "@/components/card-parallels";
import { setLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PlayerCard = NonNullable<
  Awaited<ReturnType<typeof getPlayerWithCards>>
>["club"][number];

function CardRow({ c }: { c: PlayerCard }) {
  return (
    <div className="flex gap-3 py-2 text-sm">
      <span className="w-14 shrink-0 pt-0.5 font-mono text-xs text-on-surface-variant">
        {c.cardNumber}
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant">
          {c.subset && <Badge tone="blue">{c.subset}</Badge>}
          {!c.subset && <span className="text-on-surface-variant">Base</span>}
          {c.isRookie && <Badge tone="amber">RC</Badge>}
          {c.isAutograph && <Badge>Auto</Badge>}
          {c.isRelic && <Badge>Relic</Badge>}
        </div>
        <CardParallels cardId={c.id} parallelHint={c.parallelCount} />
      </div>
    </div>
  );
}

/** Group a kit section's cards by set, set header shown once. */
function Section({
  title,
  tone,
  cards,
}: {
  title: string;
  tone: "blue" | "green" | "gray";
  cards: PlayerCard[];
}) {
  // Preserve incoming order (already sorted by year desc, cardNumber asc).
  const groups: { set: PlayerCard["set"]; cards: PlayerCard[] }[] = [];
  const bySet = new Map<string, number>();
  for (const c of cards) {
    let idx = bySet.get(c.set.id);
    if (idx === undefined) {
      idx = groups.length;
      bySet.set(c.set.id, idx);
      groups.push({ set: c.set, cards: [] });
    }
    groups[idx].cards.push(c);
  }

  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 text-title-sm text-on-surface">
        <Badge tone={tone}>{title}</Badge>
        <span className="text-on-surface-variant">{cards.length}</span>
      </h3>
      {cards.length === 0 ? (
        <EmptyState message={`No ${title.toLowerCase()} cards.`} />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            // Teams a player appears with in this set (usually one).
            const teams = [
              ...new Map(
                g.cards
                  .filter((c) => c.team)
                  .map((c) => [c.team!.slug, c.team!]),
              ).values(),
            ];
            return (
            <div key={g.set.id}>
              <div className="mb-1 border-b border-outline-variant pb-1">
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    href={`/sets/${g.set.slug}`}
                    className="truncate font-medium hover:underline"
                  >
                    {setLabel(g.set)}
                  </Link>
                  <span className="shrink-0 text-xs text-on-surface-variant">
                    {g.cards.length} card{g.cards.length === 1 ? "" : "s"}
                  </span>
                </div>
                {teams.length > 0 && (
                  <div className="flex flex-wrap gap-x-1.5 text-xs text-on-surface-variant">
                    {teams.map((t, i) => (
                      <span key={t.slug}>
                        <Link href={`/teams/${t.slug}`} className="hover:underline">
                          {t.name}
                        </Link>
                        {i < teams.length - 1 ? " ·" : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="divide-y divide-outline-variant/50">
                {g.cards.map((c) => (
                  <CardRow key={c.id} c={c} />
                ))}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPlayerWithCards(slug);
  if (!data) notFound();
  const { player, club, country, other } = data;

  return (
    <div>
      <PageHeader
        title={player.fullName}
        subtitle={[player.primaryNationality, player.positions]
          .filter(Boolean)
          .join(" · ")}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Club kit" tone="blue" cards={club} />
        <Section title="Country kit" tone="green" cards={country} />
        {other.length > 0 && (
          <div className="md:col-span-2">
            <Section title="Other" tone="gray" cards={other} />
          </div>
        )}
      </div>
    </div>
  );
}
