import { prisma } from "../db";
import { slugify } from "../utils";
import type { SetTemplate } from "./types";

/** Validate and coerce arbitrary JSON into a SetTemplate. */
export function parseTemplate(raw: unknown): SetTemplate {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Template must be a JSON object.");
  }
  const t = raw as Record<string, unknown>;
  if (typeof t.name !== "string" || !t.name.trim()) {
    throw new Error('Template must have a "name".');
  }
  if (!Array.isArray(t.cards)) {
    throw new Error('Template must have a "cards" array.');
  }
  return raw as SetTemplate;
}

/**
 * Ensure the sport, manufacturer, set, and parallels described by a template
 * exist; returns the resolved setId + sportId for the commit step.
 */
export async function ensureSetFromTemplate(template: SetTemplate) {
  const sportName = template.sport ?? "Soccer";
  const sport = await prisma.sport.upsert({
    where: { slug: slugify(sportName) },
    update: {},
    create: { name: sportName, slug: slugify(sportName) },
  });

  let manufacturerId: string | undefined;
  if (template.manufacturer) {
    const m = await prisma.manufacturer.upsert({
      where: { name: template.manufacturer },
      update: {},
      create: { name: template.manufacturer },
    });
    manufacturerId = m.id;
  }

  const slug = slugify(
    [template.year, template.brand, template.name].filter(Boolean).join("-"),
  );
  const set = await prisma.setEntity.upsert({
    where: { slug },
    update: {
      brand: template.brand ?? null,
      description: template.description ?? null,
    },
    create: {
      slug,
      name: template.name,
      brand: template.brand ?? null,
      year: template.year ?? null,
      season: template.season ?? null,
      description: template.description ?? null,
      sportId: sport.id,
      manufacturerId,
    },
  });

  for (const [i, p] of (template.parallels ?? []).entries()) {
    await prisma.parallel.upsert({
      where: {
        setId_subset_name: { setId: set.id, subset: "", name: p.name },
      },
      update: { printRun: p.printRun ?? null, isBase: p.isBase ?? false },
      create: {
        setId: set.id,
        subset: "",
        name: p.name,
        printRun: p.printRun ?? null,
        isNumbered: p.printRun != null,
        isBase: p.isBase ?? false,
        sortOrder: i,
      },
    });
  }

  return { setId: set.id, sportId: sport.id, slug };
}
