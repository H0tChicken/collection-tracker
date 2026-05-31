"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { parseMoneyToCents, slugify } from "./utils";

/** Quick-set a card's ownership status (creates or removes a CollectionItem). */
export async function setCardStatus(
  cardId: string,
  status: "OWNED" | "WANTED" | "DUPLICATE" | "NONE",
) {
  if (status === "NONE") {
    // Remove the simplest matching item (base, no parallel) if present.
    const existing = await prisma.collectionItem.findFirst({
      where: { cardId, parallelId: null },
      orderBy: { createdAt: "asc" },
    });
    if (existing) {
      await prisma.collectionItem.delete({ where: { id: existing.id } });
    }
  } else {
    const existing = await prisma.collectionItem.findFirst({
      where: { cardId, parallelId: null },
    });
    if (existing) {
      await prisma.collectionItem.update({
        where: { id: existing.id },
        data: { status },
      });
    } else {
      await prisma.collectionItem.create({ data: { cardId, status } });
    }
  }
  revalidatePath("/", "layout");
}

/** Create a new (empty) set from a form. */
export async function createSet(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const sportSlug = String(formData.get("sport") ?? "soccer");
  const sport = await prisma.sport.findUnique({ where: { slug: sportSlug } });
  if (!sport) return;
  const year = formData.get("year") ? Number(formData.get("year")) : null;
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const base = slugify(`${year ?? ""}-${brand ?? ""}-${name}`);
  await prisma.setEntity.create({
    data: {
      name,
      brand,
      year,
      slug: base || slugify(name),
      sportId: sport.id,
    },
  });
  revalidatePath("/sets");
}

/** Create or update a detailed collection item. */
export async function upsertCollectionItem(formData: FormData) {
  const id = formData.get("id") ? String(formData.get("id")) : null;
  const cardId = String(formData.get("cardId"));
  const data = {
    cardId,
    parallelId: formData.get("parallelId")
      ? String(formData.get("parallelId"))
      : null,
    status: String(formData.get("status") ?? "OWNED") as
      | "OWNED"
      | "WANTED"
      | "DUPLICATE",
    quantity: Number(formData.get("quantity") ?? 1),
    gradingCompany: String(formData.get("gradingCompany") ?? "RAW") as
      | "RAW"
      | "PSA"
      | "BGS"
      | "SGC"
      | "CSG"
      | "OTHER",
    grade: String(formData.get("grade") ?? "").trim() || null,
    certNumber: String(formData.get("certNumber") ?? "").trim() || null,
    serialNumber: String(formData.get("serialNumber") ?? "").trim() || null,
    purchasePriceCents: parseMoneyToCents(
      String(formData.get("purchasePrice") ?? ""),
    ),
    estimatedValueCents: parseMoneyToCents(
      String(formData.get("estimatedValue") ?? ""),
    ),
    purchaseSource: String(formData.get("purchaseSource") ?? "").trim() || null,
    storageLocationId: formData.get("storageLocationId")
      ? String(formData.get("storageLocationId"))
      : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  if (id) {
    await prisma.collectionItem.update({ where: { id }, data });
  } else {
    await prisma.collectionItem.create({ data });
  }
  revalidatePath("/", "layout");
}

export async function deleteCollectionItem(id: string) {
  await prisma.collectionItem.delete({ where: { id } });
  revalidatePath("/", "layout");
}

export async function createStorageLocation(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await prisma.storageLocation.create({
    data: {
      name,
      label: String(formData.get("label") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
    },
  });
  revalidatePath("/storage");
}
