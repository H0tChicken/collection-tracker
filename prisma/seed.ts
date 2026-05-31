import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Core sport.
  const soccer = await prisma.sport.upsert({
    where: { slug: "soccer" },
    update: {},
    create: { name: "Soccer", slug: "soccer" },
  });

  const panini = await prisma.manufacturer.upsert({
    where: { name: "Panini" },
    update: {},
    create: { name: "Panini" },
  });

  // A small sample set so the app isn't empty on first run.
  const set = await prisma.setEntity.upsert({
    where: { slug: "2023-24-panini-prizm-premier-league" },
    update: {},
    create: {
      slug: "2023-24-panini-prizm-premier-league",
      sportId: soccer.id,
      manufacturerId: panini.id,
      brand: "Prizm",
      name: "Prizm Premier League",
      year: 2024,
      season: "2023-24",
      description: "Sample seeded set — replace via import.",
      totalBaseCards: 0,
    },
  });

  // Parallels for the sample set.
  const parallels = [
    { name: "Base", isBase: true, sortOrder: 0 },
    { name: "Silver", isNumbered: false, sortOrder: 1 },
    { name: "Gold", printRun: 10, isNumbered: true, sortOrder: 2 },
  ];
  for (const p of parallels) {
    await prisma.parallel.upsert({
      where: { setId_name: { setId: set.id, name: p.name } },
      update: {},
      create: { setId: set.id, ...p },
    });
  }

  // A couple of sample players/teams/cards (club + country kit demo).
  const messiClub = await prisma.team.upsert({
    where: { name_teamType: { name: "Inter Miami CF", teamType: "CLUB" } },
    update: {},
    create: {
      sportId: soccer.id,
      name: "Inter Miami CF",
      teamType: "CLUB",
      country: "USA",
      league: "MLS",
      slug: "inter-miami-cf-club",
    },
  });
  const argentina = await prisma.team.upsert({
    where: { name_teamType: { name: "Argentina", teamType: "NATIONAL" } },
    update: {},
    create: {
      sportId: soccer.id,
      name: "Argentina",
      teamType: "NATIONAL",
      country: "Argentina",
      slug: "argentina-national",
    },
  });
  const messi = await prisma.player.upsert({
    where: { slug: "lionel-messi" },
    update: {},
    create: {
      sportId: soccer.id,
      fullName: "Lionel Messi",
      knownAs: "Messi",
      primaryNationality: "Argentina",
      positions: "RW,CF",
      slug: "lionel-messi",
    },
  });

  await prisma.card.upsert({
    where: { setId_cardNumber: { setId: set.id, cardNumber: "1" } },
    update: {},
    create: {
      setId: set.id,
      cardNumber: "1",
      playerId: messi.id,
      teamId: messiClub.id,
      kitType: "CLUB",
    },
  });
  await prisma.card.upsert({
    where: { setId_cardNumber: { setId: set.id, cardNumber: "2" } },
    update: {},
    create: {
      setId: set.id,
      cardNumber: "2",
      playerId: messi.id,
      teamId: argentina.id,
      kitType: "COUNTRY",
    },
  });

  const total = await prisma.card.count({ where: { setId: set.id } });
  await prisma.setEntity.update({
    where: { id: set.id },
    data: { totalBaseCards: total },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
