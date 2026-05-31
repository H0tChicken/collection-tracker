import { prisma } from "../db";
import { slugify } from "../utils";
import type { ChecklistRow, CommitResult } from "./types";

interface CommitOptions {
  setId: string;
  sportId: string;
  rows: ChecklistRow[];
  /** When true, compute counts but write nothing. */
  dryRun?: boolean;
}

/**
 * Apply normalized checklist rows to a set: upsert players, teams, and cards.
 * Cards are keyed by (setId, cardNumber) so re-importing updates in place.
 */
export async function commitChecklist({
  setId,
  sportId,
  rows,
  dryRun = false,
}: CommitOptions): Promise<CommitResult> {
  const warnings: string[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  // Caches to avoid repeated lookups within a single import.
  const playerCache = new Map<string, string>();
  const teamCache = new Map<string, string>();

  const existingNumbers = new Set(
    (
      await prisma.card.findMany({
        where: { setId },
        select: { cardNumber: true },
      })
    ).map((c) => c.cardNumber),
  );

  async function resolvePlayer(name?: string): Promise<string | undefined> {
    if (!name) return undefined;
    const key = name.toLowerCase();
    if (playerCache.has(key)) return playerCache.get(key);
    if (dryRun) {
      playerCache.set(key, "dry");
      return "dry";
    }
    const slug = slugify(`${name}`);
    const player = await prisma.player.upsert({
      where: { slug },
      update: {},
      create: { sportId, fullName: name, slug },
    });
    playerCache.set(key, player.id);
    return player.id;
  }

  async function resolveTeam(
    name?: string,
    teamType?: "CLUB" | "NATIONAL",
  ): Promise<string | undefined> {
    if (!name) return undefined;
    const tt = teamType ?? "CLUB";
    const key = `${tt}:${name.toLowerCase()}`;
    if (teamCache.has(key)) return teamCache.get(key);
    if (dryRun) {
      teamCache.set(key, "dry");
      return "dry";
    }
    const team = await prisma.team.upsert({
      where: { name_teamType: { name, teamType: tt } },
      update: {},
      create: { sportId, name, teamType: tt, slug: slugify(`${name}-${tt}`) },
    });
    teamCache.set(key, team.id);
    return team.id;
  }

  for (const row of rows) {
    if (!row.cardNumber) {
      skipped++;
      continue;
    }
    const isUpdate = existingNumbers.has(row.cardNumber);

    if (dryRun) {
      if (isUpdate) updated++;
      else created++;
      continue;
    }

    const playerId = await resolvePlayer(row.playerName);
    const teamId = await resolveTeam(row.teamName, row.teamType);

    const data = {
      playerId: playerId === "dry" ? undefined : playerId,
      teamId: teamId === "dry" ? undefined : teamId,
      kitType: row.kitType ?? "NONE",
      subset: row.subset,
      description: row.description,
      isRookie: row.isRookie ?? false,
      isAutograph: row.isAutograph ?? false,
      isRelic: row.isRelic ?? false,
    };

    await prisma.card.upsert({
      where: { setId_cardNumber: { setId, cardNumber: row.cardNumber } },
      update: data,
      create: { setId, cardNumber: row.cardNumber, ...data },
    });
    if (isUpdate) updated++;
    else created++;
  }

  // Keep the set's base-card count in sync with its checklist.
  if (!dryRun) {
    const total = await prisma.card.count({ where: { setId } });
    await prisma.setEntity.update({
      where: { id: setId },
      data: { totalBaseCards: total },
    });
  }

  return {
    rowsTotal: rows.length,
    rowsCreated: created,
    rowsUpdated: updated,
    rowsSkipped: skipped,
    warnings,
  };
}
