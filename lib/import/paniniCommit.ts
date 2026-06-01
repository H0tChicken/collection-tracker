import { prisma } from "../db";
import { slugify } from "../utils";
import { commitChecklist } from "./commit";
import type { PaniniChecklist } from "./panini";
import type { CommitResult } from "./types";

/**
 * Ensure the set + manufacturer + per-subset parallels for a parsed Panini
 * checklist exist. Returns the set/sport ids for the card commit step.
 */
export async function ensureSetFromPanini(parsed: PaniniChecklist) {
  const sportName = parsed.meta.sport || "Soccer";
  const sport = await prisma.sport.upsert({
    where: { slug: slugify(sportName) },
    update: {},
    create: { name: sportName, slug: slugify(sportName) },
  });

  let manufacturerId: string | undefined;
  if (parsed.meta.brand) {
    const m = await prisma.manufacturer.upsert({
      where: { name: parsed.meta.brand },
      update: {},
      create: { name: parsed.meta.brand },
    });
    manufacturerId = m.id;
  }

  const name = parsed.meta.program || parsed.meta.brand || "Imported Set";
  const slug = slugify(
    [parsed.meta.year, parsed.meta.brand, name].filter(Boolean).join("-"),
  );
  const set = await prisma.setEntity.upsert({
    where: { slug },
    update: { brand: parsed.meta.brand ?? null },
    create: {
      slug,
      name,
      brand: parsed.meta.brand ?? null,
      year: parsed.meta.year ?? null,
      sportId: sport.id,
      manufacturerId,
    },
  });

  // Upsert parallels per subset.
  let i = 0;
  for (const p of parsed.parallels) {
    await prisma.parallel.upsert({
      where: {
        setId_subset_name: { setId: set.id, subset: p.subset, name: p.name },
      },
      update: { printRun: p.printRun, isNumbered: p.printRun != null, isBase: p.isBase },
      create: {
        setId: set.id,
        subset: p.subset,
        name: p.name,
        printRun: p.printRun,
        isNumbered: p.printRun != null,
        isBase: p.isBase,
        sortOrder: i++,
      },
    });
  }

  return { setId: set.id, sportId: sport.id, slug };
}

/** Full commit: ensure set/parallels, then write the checklist cards. */
export async function commitPanini(
  parsed: PaniniChecklist,
  dryRun = false,
): Promise<{ result: CommitResult; setId?: string; slug?: string }> {
  if (dryRun) {
    // No writes: report what the card commit would do without a set.
    return {
      result: {
        rowsTotal: parsed.cards.length,
        rowsCreated: parsed.cards.length,
        rowsUpdated: 0,
        rowsSkipped: 0,
        warnings: parsed.warnings,
      },
    };
  }

  const { setId, sportId, slug } = await ensureSetFromPanini(parsed);
  const result = await commitChecklist({ setId, sportId, rows: parsed.cards });
  result.warnings = [...parsed.warnings, ...result.warnings];
  return { result, setId, slug };
}
