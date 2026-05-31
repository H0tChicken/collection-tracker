import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayerWithCards } from "@/lib/queries";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import { CardStatusToggle } from "@/components/card-status-toggle";

export const dynamic = "force-dynamic";

type PlayerCard = NonNullable<
  Awaited<ReturnType<typeof getPlayerWithCards>>
>["club"][number];

function CardRow({ c }: { c: PlayerCard }) {
  const baseItem = c.items.find((i) => true);
  const status = (baseItem?.status ?? "NONE") as
    | "OWNED"
    | "WANTED"
    | "DUPLICATE"
    | "NONE";
  return (
    <div className="flex items-center gap-3 py-2 text-sm">
      <span className="w-12 shrink-0 font-mono text-xs text-foreground/60">
        {c.cardNumber}
      </span>
      <div className="min-w-0 flex-1">
        <Link href={`/sets/${c.set.slug}`} className="truncate font-medium hover:underline">
          {c.set.season ?? c.set.year ?? ""} {c.set.brand} {c.set.name}
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-foreground/60">
          {c.team && <span>{c.team.name}</span>}
          {c.isRookie && <Badge tone="amber">RC</Badge>}
          {c.isAutograph && <Badge>Auto</Badge>}
          {c.isRelic && <Badge>Relic</Badge>}
        </div>
      </div>
      <CardStatusToggle cardId={c.id} current={status} />
    </div>
  );
}

function Section({
  title,
  tone,
  cards,
}: {
  title: string;
  tone: "blue" | "green" | "gray";
  cards: PlayerCard[];
}) {
  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Badge tone={tone}>{title}</Badge>
        <span className="text-foreground/50">{cards.length}</span>
      </h3>
      {cards.length === 0 ? (
        <EmptyState message={`No ${title.toLowerCase()} cards.`} />
      ) : (
        <div className="divide-y divide-black/5 dark:divide-white/10">
          {cards.map((c) => (
            <CardRow key={c.id} c={c} />
          ))}
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
