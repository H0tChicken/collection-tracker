import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import { CardStatusToggle } from "@/components/card-status-toggle";
import { setLabel } from "@/lib/utils";

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
        include: {
          player: true,
          set: true,
          items: { select: { status: true, parallelId: true } },
        },
        orderBy: [{ set: { year: "desc" } }, { cardNumber: "asc" }],
      },
    },
  });
  if (!team) notFound();

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
          <div className="divide-y divide-black/5 dark:divide-white/10">
            {team.cards.map((c) => {
              const baseItem = c.items.find((i) => i.parallelId === null);
              const status = (baseItem?.status ?? "NONE") as
                | "OWNED"
                | "WANTED"
                | "DUPLICATE"
                | "NONE";
              return (
                <div key={c.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-12 shrink-0 font-mono text-xs text-foreground/60">
                    {c.cardNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {c.player ? (
                        <Link href={`/players/${c.player.slug}`} className="hover:underline">
                          {c.player.fullName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </div>
                    <Link
                      href={`/sets/${c.set.slug}`}
                      className="block truncate text-xs text-foreground/60 hover:underline"
                    >
                      {setLabel(c.set)}
                      {c.subset ? ` · ${c.subset}` : ""}
                    </Link>
                  </div>
                  <div className="shrink-0">
                    <CardStatusToggle cardId={c.id} current={status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
