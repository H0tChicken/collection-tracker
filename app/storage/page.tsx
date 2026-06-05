import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, PageHeader, EmptyState } from "@/components/ui";
import { createStorageLocation } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function StoragePage() {
  const locations = await prisma.storageLocation.findMany({
    include: { _count: { select: { items: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Storage locations"
        subtitle="Label your bins and binders, then assign cards to them"
      />

      <Card className="mb-5">
        <form action={createStorageLocation} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant">
              Name
            </label>
            <input
              name="name"
              required
              placeholder="Bin A"
              className="rounded-sm border border-outline bg-surface px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant">
              Label
            </label>
            <input
              name="label"
              placeholder="Top shelf — Prizm PL"
              className="rounded-sm border border-outline bg-surface px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-primary px-5 py-2.5 text-label-lg text-on-primary hover:md-elev-1"
          >
            Add location
          </button>
        </form>
      </Card>

      {locations.length === 0 ? (
        <EmptyState message="No storage locations yet." />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {locations.map((l) => (
            <Link key={l.id} href={`/collection?location=${l.id}`} className="block">
              <Card variant="filled" interactive className="h-full">
                <div className="font-medium">{l.name}</div>
                {l.label && (
                  <div className="text-xs text-on-surface-variant">{l.label}</div>
                )}
                <div className="mt-1 text-xs text-on-surface-variant">
                  {l._count.items} cards
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
