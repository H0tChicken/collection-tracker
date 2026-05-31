import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { ImportForm } from "@/components/import-form";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const sets = await prisma.setEntity.findMany({
    orderBy: [{ year: "desc" }, { name: "asc" }],
    select: { id: true, name: true, brand: true, season: true, year: true },
  });
  return (
    <div>
      <PageHeader
        title="Import"
        subtitle="Bring in set checklists from JSON templates, CSV, Excel, or PDF"
      />
      <ImportForm
        sets={sets.map((s) => ({
          id: s.id,
          label: `${s.season ?? s.year ?? ""} ${s.brand ?? ""} ${s.name}`.trim(),
        }))}
      />
    </div>
  );
}
