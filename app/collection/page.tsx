import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, PageHeader, Badge, EmptyState, SegmentedButtons } from "@/components/ui";
import { formatMoney, setLabel } from "@/lib/utils";
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
      <div className="mb-4">
        <SegmentedButtons
          segments={[
            { label: "All", href: "/collection", selected: !status },
            ...STATUS_TABS.map((t) => ({
              label: t.label,
              href: `/collection?status=${t.value}`,
              selected: status === t.value,
            })),
          ]}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState message="No items match this filter." />
      ) : (
        <Card>
          <div className="divide-y divide-outline-variant/50">
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
                    <span className="ml-2 font-mono text-xs text-on-surface-variant">
                      #{it.card.cardNumber}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant">
                    <Link href={`/sets/${it.card.set.slug}`} className="hover:underline">
                      {setLabel(it.card.set)}
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
                <div className="text-right text-xs text-on-surface-variant">
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
