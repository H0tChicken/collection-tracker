import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Full database export as a single JSON document, for backup/migration. */
export async function GET() {
  const [
    sports,
    manufacturers,
    sets,
    parallels,
    players,
    teams,
    cards,
    storageLocations,
    collectionItems,
    cardImages,
  ] = await Promise.all([
    prisma.sport.findMany(),
    prisma.manufacturer.findMany(),
    prisma.setEntity.findMany(),
    prisma.parallel.findMany(),
    prisma.player.findMany(),
    prisma.team.findMany(),
    prisma.card.findMany(),
    prisma.storageLocation.findMany(),
    prisma.collectionItem.findMany(),
    prisma.cardImage.findMany(),
  ]);

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      sports,
      manufacturers,
      sets,
      parallels,
      players,
      teams,
      cards,
      storageLocations,
      collectionItems,
      cardImages,
    },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="collection-export-${Date.now()}.json"`,
    },
  });
}
