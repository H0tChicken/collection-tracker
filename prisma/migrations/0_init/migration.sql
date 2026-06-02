-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TeamType" AS ENUM ('CLUB', 'NATIONAL');

-- CreateEnum
CREATE TYPE "KitType" AS ENUM ('CLUB', 'COUNTRY', 'NONE');

-- CreateEnum
CREATE TYPE "OwnershipStatus" AS ENUM ('OWNED', 'WANTED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "GradingCompany" AS ENUM ('RAW', 'PSA', 'BGS', 'SGC', 'CSG', 'OTHER');

-- CreateEnum
CREATE TYPE "ImportFormat" AS ENUM ('JSON_TEMPLATE', 'CSV', 'XLSX', 'PDF', 'PANINI_CSV', 'MANUAL');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PREVIEW', 'COMMITTED', 'FAILED');

-- CreateEnum
CREATE TYPE "SetSource" AS ENUM ('BUNDLED', 'USER');

-- CreateTable
CREATE TABLE "Sport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manufacturer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetEntity" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "manufacturerId" TEXT,
    "brand" TEXT,
    "name" TEXT NOT NULL,
    "year" INTEGER,
    "season" TEXT,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "totalBaseCards" INTEGER NOT NULL DEFAULT 0,
    "source" "SetSource" NOT NULL DEFAULT 'BUNDLED',
    "externalId" TEXT,
    "contentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parallel" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "subset" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "printRun" INTEGER,
    "isNumbered" BOOLEAN NOT NULL DEFAULT false,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Parallel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "knownAs" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "primaryNationality" TEXT,
    "positions" TEXT,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teamType" "TeamType" NOT NULL,
    "country" TEXT,
    "league" TEXT,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "playerId" TEXT,
    "teamId" TEXT,
    "kitType" "KitType" NOT NULL DEFAULT 'NONE',
    "subset" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "isRookie" BOOLEAN NOT NULL DEFAULT false,
    "isAutograph" BOOLEAN NOT NULL DEFAULT false,
    "isRelic" BOOLEAN NOT NULL DEFAULT false,
    "retired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorageLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionItem" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "parallelId" TEXT,
    "status" "OwnershipStatus" NOT NULL DEFAULT 'OWNED',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "gradingCompany" "GradingCompany" NOT NULL DEFAULT 'RAW',
    "grade" TEXT,
    "certNumber" TEXT,
    "conditionNote" TEXT,
    "serialNumber" TEXT,
    "purchasePriceCents" INTEGER,
    "purchaseDate" TIMESTAMP(3),
    "purchaseSource" TEXT,
    "estimatedValueCents" INTEGER,
    "storageLocationId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardImage" (
    "id" TEXT NOT NULL,
    "cardId" TEXT,
    "collectionItemId" TEXT,
    "path" TEXT,
    "externalUrl" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL,
    "format" "ImportFormat" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PREVIEW',
    "sourceName" TEXT,
    "setId" TEXT,
    "rowsTotal" INTEGER NOT NULL DEFAULT 0,
    "rowsCreated" INTEGER NOT NULL DEFAULT 0,
    "rowsUpdated" INTEGER NOT NULL DEFAULT 0,
    "rowsSkipped" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sport_name_key" ON "Sport"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Sport_slug_key" ON "Sport"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Manufacturer_name_key" ON "Manufacturer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SetEntity_slug_key" ON "SetEntity"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SetEntity_externalId_key" ON "SetEntity"("externalId");

-- CreateIndex
CREATE INDEX "SetEntity_sportId_idx" ON "SetEntity"("sportId");

-- CreateIndex
CREATE INDEX "SetEntity_year_idx" ON "SetEntity"("year");

-- CreateIndex
CREATE INDEX "Parallel_setId_idx" ON "Parallel"("setId");

-- CreateIndex
CREATE UNIQUE INDEX "Parallel_setId_subset_name_key" ON "Parallel"("setId", "subset", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Player_slug_key" ON "Player"("slug");

-- CreateIndex
CREATE INDEX "Player_sportId_idx" ON "Player"("sportId");

-- CreateIndex
CREATE INDEX "Player_fullName_idx" ON "Player"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE INDEX "Team_sportId_idx" ON "Team"("sportId");

-- CreateIndex
CREATE INDEX "Team_teamType_idx" ON "Team"("teamType");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_teamType_key" ON "Team"("name", "teamType");

-- CreateIndex
CREATE INDEX "Card_setId_idx" ON "Card"("setId");

-- CreateIndex
CREATE INDEX "Card_setId_subset_idx" ON "Card"("setId", "subset");

-- CreateIndex
CREATE INDEX "Card_playerId_idx" ON "Card"("playerId");

-- CreateIndex
CREATE INDEX "Card_teamId_idx" ON "Card"("teamId");

-- CreateIndex
CREATE INDEX "Card_kitType_idx" ON "Card"("kitType");

-- CreateIndex
CREATE UNIQUE INDEX "Card_setId_subset_cardNumber_key" ON "Card"("setId", "subset", "cardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StorageLocation_name_key" ON "StorageLocation"("name");

-- CreateIndex
CREATE INDEX "CollectionItem_cardId_idx" ON "CollectionItem"("cardId");

-- CreateIndex
CREATE INDEX "CollectionItem_status_idx" ON "CollectionItem"("status");

-- CreateIndex
CREATE INDEX "CollectionItem_parallelId_idx" ON "CollectionItem"("parallelId");

-- CreateIndex
CREATE INDEX "CollectionItem_storageLocationId_idx" ON "CollectionItem"("storageLocationId");

-- CreateIndex
CREATE INDEX "CardImage_cardId_idx" ON "CardImage"("cardId");

-- CreateIndex
CREATE INDEX "CardImage_collectionItemId_idx" ON "CardImage"("collectionItemId");

-- AddForeignKey
ALTER TABLE "SetEntity" ADD CONSTRAINT "SetEntity_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetEntity" ADD CONSTRAINT "SetEntity_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parallel" ADD CONSTRAINT "Parallel_setId_fkey" FOREIGN KEY ("setId") REFERENCES "SetEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_setId_fkey" FOREIGN KEY ("setId") REFERENCES "SetEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_parallelId_fkey" FOREIGN KEY ("parallelId") REFERENCES "Parallel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_storageLocationId_fkey" FOREIGN KEY ("storageLocationId") REFERENCES "StorageLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardImage" ADD CONSTRAINT "CardImage_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardImage" ADD CONSTRAINT "CardImage_collectionItemId_fkey" FOREIGN KEY ("collectionItemId") REFERENCES "CollectionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

