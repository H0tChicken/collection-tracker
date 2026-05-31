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
            <label className="block text-xs font-medium text-foreground/60">
              Name
            </label>
            <input
              name="name"
              required
              placeholder="Bin A"
              className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/60">
              Label
            </label>
            <input
              name="label"
              placeholder="Top shelf — Prizm PL"
              className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
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
            <Link key={l.id} href={`/collection?location=${l.id}`}>
              <Card className="transition hover:shadow-md">
                <div className="font-medium">{l.name}</div>
                {l.label && (
                  <div className="text-xs text-foreground/60">{l.label}</div>
                )}
                <div className="mt-1 text-xs text-foreground/50">
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
