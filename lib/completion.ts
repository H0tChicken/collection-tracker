// Set-completion calculation. Kept pure (no DB) so it is easily unit-tested;
// `getSetCompletion` below is the thin DB wrapper used by the app.

import { prisma } from "./db";

export interface OwnedTuple {
  cardId: string;
  /** null means the base card (no parallel). */
  parallelId: string | null;
  status: "OWNED" | "WANTED" | "DUPLICATE";
}

export interface ParallelDef {
  id: string;
  name: string;
  isBase: boolean;
}

export interface ParallelProgress {
  parallelId: string | null;
  name: string;
  owned: number;
  total: number;
  ratio: number;
}

export interface SetCompletion {
  totalCards: number;
  baseOwned: number;
  baseRatio: number;
  /** Per-parallel progress, plus the synthetic "Base" line (parallelId null). */
  parallels: ParallelProgress[];
}

/**
 * Pure completion calculator.
 * @param totalCards  number of distinct checklist cards in the set
 * @param owned       owned/duplicate items (WANTED is excluded from completion)
 * @param parallels   parallel definitions for the set
 */
export function computeCompletion(
  totalCards: number,
  owned: OwnedTuple[],
  parallels: ParallelDef[],
): SetCompletion {
  const counted = owned.filter((o) => o.status !== "WANTED");

  // distinct cardIds owned at base level (no parallel)
  const baseCardIds = new Set(
    counted.filter((o) => o.parallelId === null).map((o) => o.cardId),
  );
  const baseOwned = baseCardIds.size;
  const baseRatio = totalCards > 0 ? baseOwned / totalCards : 0;

  const lines: ParallelProgress[] = [
    {
      parallelId: null,
      name: "Base",
      owned: baseOwned,
      total: totalCards,
      ratio: baseRatio,
    },
  ];

  for (const p of parallels) {
    if (p.isBase) continue; // base handled above
    const ids = new Set(
      counted.filter((o) => o.parallelId === p.id).map((o) => o.cardId),
    );
    lines.push({
      parallelId: p.id,
      name: p.name,
      owned: ids.size,
      total: totalCards,
      ratio: totalCards > 0 ? ids.size / totalCards : 0,
    });
  }

  return {
    totalCards,
    baseOwned,
    baseRatio,
    parallels: lines,
  };
}

/** DB wrapper: compute completion for a given set. */
export async function getSetCompletion(setId: string): Promise<SetCompletion> {
  const [totalCards, items, parallels] = await Promise.all([
    prisma.card.count({ where: { setId } }),
    prisma.collectionItem.findMany({
      where: { card: { setId } },
      select: { cardId: true, parallelId: true, status: true },
    }),
    prisma.parallel.findMany({
      where: { setId },
      select: { id: true, name: true, isBase: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return computeCompletion(
    totalCards,
    items.map((i) => ({
      cardId: i.cardId,
      parallelId: i.parallelId,
      status: i.status as OwnedTuple["status"],
    })),
    parallels,
  );
}

export interface SubsetCompletion {
  subset: string; // "" = base
  label: string; // display name ("Base" for "")
  totalCards: number;
  owned: number;
  ratio: number;
}

/**
 * Per-subset base completion for a set (one bar per subset). Counts a card as
 * owned when any non-WANTED item exists for it at the base parallel level.
 */
export async function getSubsetCompletion(
  setId: string,
): Promise<SubsetCompletion[]> {
  const [cards, items] = await Promise.all([
    prisma.card.findMany({ where: { setId }, select: { id: true, subset: true } }),
    prisma.collectionItem.findMany({
      where: { card: { setId }, parallelId: null, status: { not: "WANTED" } },
      select: { cardId: true },
    }),
  ]);

  const ownedIds = new Set(items.map((i) => i.cardId));
  const bySubset = new Map<string, { total: number; owned: number }>();
  for (const c of cards) {
    const g = bySubset.get(c.subset) ?? { total: 0, owned: 0 };
    g.total++;
    if (ownedIds.has(c.id)) g.owned++;
    bySubset.set(c.subset, g);
  }

  return [...bySubset.entries()]
    .map(([subset, g]) => ({
      subset,
      label: subset === "" ? "Base" : subset,
      totalCards: g.total,
      owned: g.owned,
      ratio: g.total > 0 ? g.owned / g.total : 0,
    }))
    .sort((a, b) => {
      if (a.subset === "") return -1; // base first
      if (b.subset === "") return 1;
      return b.totalCards - a.totalCards;
    });
}
