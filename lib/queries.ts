import { prisma } from "./db";

/** Dashboard summary stats. */
export async function getDashboardStats() {
  const [owned, wanted, setsTracked, players, valueAgg] = await Promise.all([
    prisma.collectionItem.count({ where: { status: "OWNED" } }),
    prisma.collectionItem.count({ where: { status: "WANTED" } }),
    prisma.setEntity.count(),
    prisma.player.count(),
    prisma.collectionItem.aggregate({
      where: { status: "OWNED" },
      _sum: { estimatedValueCents: true, purchasePriceCents: true },
    }),
  ]);
  return {
    owned,
    wanted,
    setsTracked,
    players,
    estValueCents: valueAgg._sum.estimatedValueCents ?? 0,
    spentCents: valueAgg._sum.purchasePriceCents ?? 0,
  };
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
  return {
    player,
    club: player.cards.filter((c) => c.kitType === "CLUB"),
    country: player.cards.filter((c) => c.kitType === "COUNTRY"),
    other: player.cards.filter((c) => c.kitType === "NONE"),
  };
}
