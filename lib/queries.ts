import { prisma } from "./db";
import { compareCardNumbers, compareParallels } from "./utils";

/**
 * Full ownership detail for a single card: every parallel it can exist in
 * (synthetic "Base" + the set/subset's defined parallels, with print runs),
 * and the collection copies the user holds for each — supporting multiples,
 * grading, serials, etc. Used by the per-parallel tracking UI.
 */
export async function getCardOwnership(cardId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { id: true, setId: true, subset: true, cardNumber: true },
  });
  if (!card) return null;

  const [parallels, items, storageLocations] = await Promise.all([
    prisma.parallel.findMany({
      where: { setId: card.setId, subset: card.subset },
      select: { id: true, name: true, printRun: true, odds: true, isBase: true },
    }),
    prisma.collectionItem.findMany({
      where: { cardId },
      orderBy: { createdAt: "asc" },
      include: { storageLocation: { select: { id: true, name: true } } },
    }),
    prisma.storageLocation.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  // The base card itself is parallelId = null; represent it as a synthetic row.
  // Order: Base → non-numbered (SP/SSP) → numbered high → low.
  const rows = [
    {
      id: null as string | null,
      name: "Base",
      printRun: null as number | null,
      odds: null as string | null,
      isBase: true,
    },
    ...parallels
      .filter((p) => !p.isBase)
      .sort(compareParallels)
      .map((p) => ({
        id: p.id,
        name: p.name,
        printRun: p.printRun,
        odds: p.odds,
        isBase: false,
      })),
  ];

  return {
    card,
    storageLocations,
    parallels: rows.map((row) => ({
      ...row,
      copies: items.filter((i) => i.parallelId === (row.id ?? null)),
    })),
  };
}

/** Dashboard summary stats. */
export async function getDashboardStats() {
  const [owned, wanted, setsTracked, players] = await Promise.all([
    prisma.collectionItem.count({ where: { status: "OWNED" } }),
    prisma.collectionItem.count({ where: { status: "WANTED" } }),
    prisma.setEntity.count(),
    prisma.player.count(),
  ]);
  return { owned, wanted, setsTracked, players };
}

/** Player detail with cards split by kit type. */
export async function getPlayerWithCards(slug: string) {
  const player = await prisma.player.findUnique({
    where: { slug },
    include: {
      cards: {
        where: { retired: false },
        include: {
          set: true,
          team: true,
          items: { select: { id: true, status: true } },
        },
        orderBy: [{ set: { year: "desc" } }, { cardNumber: "asc" }],
      },
    },
  });
  if (!player) return null;

  // Count available parallels per (set, subset) so each card can show how many
  // variants exist. Base parallel ("Base") is excluded from the count.
  const setIds = [...new Set(player.cards.map((c) => c.setId))];
  const parallels = setIds.length
    ? await prisma.parallel.findMany({
        where: { setId: { in: setIds }, isBase: false },
        select: { setId: true, subset: true },
      })
    : [];
  const parallelCount = new Map<string, number>();
  for (const p of parallels) {
    const k = `${p.setId}|${p.subset}`;
    parallelCount.set(k, (parallelCount.get(k) ?? 0) + 1);
  }

  const cards = player.cards
    .map((c) => ({
      ...c,
      parallelCount: parallelCount.get(`${c.setId}|${c.subset}`) ?? 0,
    }))
    // Newest set first, then natural card-number order within each set.
    .sort((a, b) => {
      const ya = a.set.year ?? 0;
      const yb = b.set.year ?? 0;
      if (ya !== yb) return yb - ya;
      if (a.setId !== b.setId) return a.set.name.localeCompare(b.set.name);
      return compareCardNumbers(a.cardNumber, b.cardNumber);
    });

  return {
    player,
    club: cards.filter((c) => c.kitType === "CLUB"),
    country: cards.filter((c) => c.kitType === "COUNTRY"),
    other: cards.filter((c) => c.kitType === "NONE"),
  };
}
