import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Card, PageHeader, Badge, EmptyState, SegmentedButtons } from "@/components/ui";
import { SearchInput } from "@/components/search-input";
import { SlabImages } from "@/components/slab-images";
import { CollectionItemEditor } from "@/components/collection-item-editor";
import { setLabel } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const STATUS_TABS = [
  { value: "OWNED", label: "Owned" },
  { value: "WANTED", label: "Wishlist" },
  { value: "DUPLICATE", label: "Duplicates" },
] as const;

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; location?: string; q?: string; page?: string }>;
}) {
  const { status, location, q: rawQ, page: rawPage } = await searchParams;
  const q = rawQ?.trim() ?? "";
  const page = Math.max(1, Number(rawPage ?? 1) || 1);

  const where: Prisma.CollectionItemWhereInput = {};
  if (status === "OWNED" || status === "WANTED" || status === "DUPLICATE") {
    where.status = status;
  }
  if (location) where.storageLocationId = location;
  if (q) {
    where.card = {
      OR: [
        { player: { fullName: { contains: q, mode: "insensitive" } } },
        { cardNumber: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    };
  }

  const [items, total, storageLocations] = await Promise.all([
    prisma.collectionItem.findMany({
      where,
      include: {
        card: { include: { player: true, team: true, set: true } },
        parallel: true,
        storageLocation: true,
      },
      orderBy: [
        { card: { set: { year: "desc" } } },
        { card: { set: { name: "asc" } } },
        { card: { cardNumber: "asc" } },
      ],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.collectionItem.count({ where }),
    prisma.storageLocation.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Group items by set for display.
  const groups: { setId: string; setSlug: string; setLabel: string; items: typeof items }[] = [];
  const setIndex = new Map<string, number>();
  for (const it of items) {
    const sid = it.card.set.id;
    let idx = setIndex.get(sid);
    if (idx === undefined) {
      idx = groups.length;
      setIndex.set(sid, idx);
      groups.push({ setId: sid, setSlug: it.card.set.slug, setLabel: setLabel(it.card.set), items: [] });
    }
    groups[idx].items.push(it);
  }

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (location) params.set("location", location);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/collection${s ? `?${s}` : ""}`;
  }

  const setCount = groups.length;
  const subtitle =
    total === 0
      ? "0 items"
      : [
          `${total} item${total !== 1 ? "s" : ""}`,
          setCount > 1 ? `${setCount} sets` : null,
          totalPages > 1 ? `page ${page} of ${totalPages}` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <div>
      <PageHeader title="Collection" subtitle={subtitle} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
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
        <Suspense fallback={null}>
          <SearchInput
            param="q"
            placeholder="Player or card #…"
            clearParams={["page"]}
          />
        </Suspense>
      </div>

      {items.length === 0 ? (
        <EmptyState message={q ? `No items match "${q}".` : "No items match this filter."} />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.setId}>
              <div className="mb-2 border-b border-outline-variant pb-2">
                <Link
                  href={`/sets/${group.setSlug}`}
                  className="font-medium hover:underline"
                >
                  {group.setLabel}
                </Link>
                <span className="ml-2 text-xs text-on-surface-variant">
                  {group.items.length} card{group.items.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="divide-y divide-outline-variant/50">
                {group.items.map((it) => (
                  <div key={it.id} className="flex items-start gap-3 py-2 text-sm">
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
                        {it.parallel && <Badge tone="blue">{it.parallel.name}</Badge>}
                        {it.serialNumber && <span>{it.serialNumber}</span>}
                        {it.gradingCompany !== "RAW" && (
                          <Badge tone="amber">
                            {it.gradingCompany} {it.grade}
                          </Badge>
                        )}
                        {it.storageLocation && (
                          <Badge>{it.storageLocation.name}</Badge>
                        )}
                      </div>
                      {it.gradingCompany === "TAG" && it.certNumber && (
                        <SlabImages certNumber={it.certNumber} />
                      )}
                      <CollectionItemEditor item={it} storageLocations={storageLocations} />
                    </div>
                    <div className="shrink-0 text-right text-xs text-on-surface-variant">
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
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-on-surface-variant">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref(page - 1)}
                className="rounded-full border border-outline px-4 py-2 text-label-md text-on-surface hover:bg-on-surface/[0.08]"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageHref(page + 1)}
                className="rounded-full bg-primary px-4 py-2 text-label-md text-on-primary hover:md-elev-1"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
