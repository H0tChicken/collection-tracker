import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { value: "OWNED", label: "Owned" },
  { value: "WANTED", label: "Wishlist" },
  { value: "DUPLICATE", label: "Duplicates" },
] as const;

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; location?: string }>;
}) {
  const { status, location } = await searchParams;
  const where: Prisma.CollectionItemWhereInput = {};
  if (status === "OWNED" || status === "WANTED" || status === "DUPLICATE") {
    where.status = status;
  }
  if (location) where.storageLocationId = location;

  const items = await prisma.collectionItem.findMany({
    where,
    include: {
      card: { include: { player: true, team: true, set: true } },
      parallel: true,
      storageLocation: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  return (
    <div>
      <PageHeader title="Collection" subtitle={`${items.length} items`} />
      <div className="mb-4 flex gap-2 text-sm">
        <Link
          href="/collection"
          className={!status ? "font-semibold text-brand-600" : "text-foreground/60"}
        >
          All
        </Link>
        {STATUS_TABS.map((t) => (
          <Link
            key={t.value}
            href={`/collection?status=${t.value}`}
            className={status === t.value ? "font-semibold text-brand-600" : "text-foreground/60"}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState message="No items match this filter." />
      ) : (
        <Card>
          <div className="divide-y divide-black/5 dark:divide-white/10">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {it.card.player ? (
                      <Link href={`/players/${it.card.player.slug}`} className="hover:underline">
                        {it.card.player.fullName}
                      </Link>
                    ) : (
                      it.card.description ?? "—"
                    )}
                    <span className="ml-2 font-mono text-xs text-foreground/50">
                      #{it.card.cardNumber}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/60">
                    <Link href={`/sets/${it.card.set.slug}`} className="hover:underline">
                      {it.card.set.brand} {it.card.set.name}
                    </Link>
                    {it.parallel && <Badge tone="blue">{it.parallel.name}</Badge>}
                    {it.serialNumber && <span>/{it.serialNumber}</span>}
                    {it.gradingCompany !== "RAW" && (
                      <Badge tone="amber">
                        {it.gradingCompany} {it.grade}
                      </Badge>
                    )}
                    {it.storageLocation && (
                      <Badge>{it.storageLocation.name}</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs text-foreground/60">
                  <div>{formatMoney(it.estimatedValueCents)}</div>
                  <Badge
                    tone={
                      it.status === "OWNED"
                        ? "green"
                        : it.status === "WANTED"
                          ? "amber"
                          : "gray"
                    }
                  >
                    {it.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
