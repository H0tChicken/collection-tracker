// Boot-time catalog sync (plain ESM so it runs with `node` in the slim runtime
// image — no tsx/devDependencies). Reconciles the compiled, bundled catalog
// files in catalog/dist/ into the database.
//
// Invariants:
//  - BUNDLED sets are identified by their stable `externalId`.
//  - A set whose `contentHash` is unchanged is skipped (fast no-op on every boot).
//  - Cards are upserted by their natural key (setId, subset, cardNumber); we
//    NEVER delete-and-recreate, so user CollectionItem rows are never orphaned.
//  - A card that disappears from an updated checklist is soft-retired
//    (retired=true), not deleted.
//
// Run automatically from entrypoint.sh after `prisma migrate deploy`, or
// manually via `npm run catalog:sync`.
import { PrismaClient } from "@prisma/client";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const prisma = new PrismaClient();
const DIST_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "catalog",
  "dist",
);

function slugify(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureSport(name) {
  const slug = slugify(name);
  return prisma.sport.upsert({
    where: { slug },
    update: {},
    create: { name, slug },
  });
}

async function ensureManufacturer(name) {
  if (!name) return null;
  const m = await prisma.manufacturer.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  return m.id;
}

async function syncSet(doc) {
  const existing = await prisma.setEntity.findUnique({
    where: { externalId: doc.externalId },
    select: { id: true, contentHash: true },
  });

  if (existing && existing.contentHash === doc.contentHash) {
    return { externalId: doc.externalId, skipped: true };
  }

  const sport = await ensureSport(doc.sport || "Soccer");
  const manufacturerId = await ensureManufacturer(doc.brand);
  const slug = slugify(
    [doc.year, doc.brand, doc.name].filter(Boolean).join("-") || doc.externalId,
  );

  const set = await prisma.setEntity.upsert({
    where: { externalId: doc.externalId },
    update: {
      name: doc.name,
      brand: doc.brand,
      year: doc.year,
      season: doc.season,
      description: doc.description,
      slug,
      sportId: sport.id,
      manufacturerId,
      source: "BUNDLED",
      contentHash: doc.contentHash,
    },
    create: {
      externalId: doc.externalId,
      name: doc.name,
      brand: doc.brand,
      year: doc.year,
      season: doc.season,
      description: doc.description,
      slug,
      sportId: sport.id,
      manufacturerId,
      source: "BUNDLED",
      contentHash: doc.contentHash,
    },
  });

  // Parallels: upsert by (setId, subset, name).
  let order = 0;
  const seenParallels = new Set();
  for (const p of doc.parallels) {
    seenParallels.add(`${p.subset}|${p.name}`);
    await prisma.parallel.upsert({
      where: {
        setId_subset_name: { setId: set.id, subset: p.subset, name: p.name },
      },
      update: {
        printRun: p.printRun,
        odds: p.odds ?? null,
        isNumbered: p.printRun != null,
        isBase: p.isBase,
      },
      create: {
        setId: set.id,
        subset: p.subset,
        name: p.name,
        printRun: p.printRun,
        odds: p.odds ?? null,
        isNumbered: p.printRun != null,
        isBase: p.isBase,
        sortOrder: order++,
      },
    });
  }

  // Prune parallels no longer in the catalog (e.g. renamed/removed). Only delete
  // ones with no owned copies; otherwise leave them so user data is never lost.
  const existingParallels = await prisma.parallel.findMany({
    where: { setId: set.id },
    select: { id: true, subset: true, name: true, _count: { select: { items: true } } },
  });
  const orphanIds = existingParallels
    .filter(
      (p) =>
        !seenParallels.has(`${p.subset}|${p.name}`) && p._count.items === 0,
    )
    .map((p) => p.id);
  if (orphanIds.length > 0) {
    await prisma.parallel.deleteMany({ where: { id: { in: orphanIds } } });
  }

  // Resolve players/teams with in-run caches.
  const playerCache = new Map();
  const teamCache = new Map();
  async function resolvePlayer(name) {
    if (!name) return null;
    const key = name.toLowerCase();
    if (playerCache.has(key)) return playerCache.get(key);
    const player = await prisma.player.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { sportId: sport.id, fullName: name, slug: slugify(name) },
    });
    playerCache.set(key, player.id);
    return player.id;
  }
  async function resolveTeam(name, teamType) {
    if (!name) return null;
    const tt = teamType ?? "CLUB";
    const key = `${tt}:${name.toLowerCase()}`;
    if (teamCache.has(key)) return teamCache.get(key);
    const slug = slugify(`${name}-${tt}`);
    // Two distinct source spellings can collapse to one slug (e.g. a stray
    // unicode lookalike). The slug is unique, so reuse any existing team with
    // this slug instead of trying to create a duplicate.
    let team = await prisma.team.findUnique({ where: { slug } });
    if (!team) {
      team = await prisma.team.upsert({
        where: { name_teamType: { name, teamType: tt } },
        update: {},
        create: { sportId: sport.id, name, teamType: tt, slug },
      });
    }
    teamCache.set(key, team.id);
    return team.id;
  }

  // Cards: upsert by (setId, subset, cardNumber). Pre-fetch existing keys to
  // count created vs updated (Card has no updatedAt to compare). Track which we
  // saw so we can soft-retire any that vanished from the checklist.
  const existingKeys = new Set(
    (
      await prisma.card.findMany({
        where: { setId: set.id },
        select: { subset: true, cardNumber: true },
      })
    ).map((c) => `${c.subset} ${c.cardNumber}`),
  );
  const seen = new Set();
  let created = 0;
  let updated = 0;
  for (const c of doc.cards) {
    const subset = c.subset ?? "";
    const key = `${subset} ${c.cardNumber}`;
    seen.add(key);
    const playerId = await resolvePlayer(c.playerName);
    const teamId = await resolveTeam(c.teamName, c.teamType);
    const data = {
      playerId,
      teamId,
      kitType: c.kitType ?? "NONE",
      isRookie: c.isRookie ?? false,
      isAutograph: c.isAutograph ?? false,
      isRelic: c.isRelic ?? false,
      retired: false, // resurrect if it had been retired before
    };
    await prisma.card.upsert({
      where: {
        setId_subset_cardNumber: {
          setId: set.id,
          subset,
          cardNumber: c.cardNumber,
        },
      },
      update: data,
      create: { setId: set.id, subset, cardNumber: c.cardNumber, ...data },
    });
    if (existingKeys.has(key)) updated++;
    else created++;
  }

  // Soft-retire cards no longer in the checklist (keeps CollectionItem intact).
  const dbCards = await prisma.card.findMany({
    where: { setId: set.id, retired: false },
    select: { id: true, subset: true, cardNumber: true },
  });
  const toRetire = dbCards
    .filter((c) => !seen.has(`${c.subset} ${c.cardNumber}`))
    .map((c) => c.id);
  if (toRetire.length > 0) {
    await prisma.card.updateMany({
      where: { id: { in: toRetire } },
      data: { retired: true },
    });
  }

  // Keep base-card count current (base subset, non-retired).
  const totalBase = await prisma.card.count({
    where: { setId: set.id, subset: "", retired: false },
  });
  await prisma.setEntity.update({
    where: { id: set.id },
    data: { totalBaseCards: totalBase },
  });

  return {
    externalId: doc.externalId,
    skipped: false,
    created,
    updated,
    retired: toRetire.length,
  };
}

async function main() {
  let files = [];
  try {
    files = readdirSync(DIST_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    console.log("No catalog/dist directory; nothing to sync.");
    return;
  }
  if (files.length === 0) {
    console.log("No compiled catalog files found; nothing to sync.");
    return;
  }

  for (const f of files) {
    const doc = JSON.parse(readFileSync(path.join(DIST_DIR, f), "utf8"));
    const r = await syncSet(doc);
    if (r.skipped) {
      console.log(`  = ${r.externalId} (unchanged)`);
    } else {
      console.log(
        `  + ${r.externalId}: ${r.created} created, ${r.updated} updated, ${r.retired} retired`,
      );
    }
  }
  console.log(`Catalog sync complete (${files.length} set file(s)).`);
}

main()
  .catch((e) => {
    console.error("Catalog sync failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
