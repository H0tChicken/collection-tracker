"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  parseTagXlsx,
  extractNumericGrade,
  parallelScore,
} from "@/lib/import/tagSubmission";

export type PreviewStatus =
  | "ok"
  | "ok-no-parallel"
  | "skip-processing-failure"
  | "skip-dup-cert-in-file"
  | "skip-dup-cert-in-db"
  | "no-set"
  | "no-card";

export interface PreviewRow {
  itemNumber: number;
  cardName: string;
  certNumber: string;
  year: number | null;
  brand: string | null;
  variation: string | null;
  cardNumberStr: string | null;
  grade: string | null;
  numericGrade: string | null;
  status: PreviewStatus;
  matchedCardId: string | null;
  matchedParallelId: string | null;
  matchedSetName: string | null;
  matchedParallelName: string | null;
}

export async function previewTagImport(
  rawRows: unknown[][],
): Promise<PreviewRow[]> {
  const tagRows = parseTagXlsx(rawRows);

  // Existing cert numbers in the DB.
  const existingCerts = await prisma.collectionItem.findMany({
    where: { certNumber: { not: null } },
    select: { certNumber: true },
  });
  const existingCertSet = new Set(existingCerts.map((c) => c.certNumber!));

  // All sets for matching.
  const allSets = await prisma.setEntity.findMany({
    select: { id: true, name: true, year: true },
  });

  const preview: PreviewRow[] = [];
  const seenCertsInFile = new Set<string>();

  for (const row of tagRows) {
    const base = {
      itemNumber: row.itemNumber,
      cardName: row.cardName,
      certNumber: row.certNumber,
      year: row.year,
      brand: row.brand,
      variation: row.variation,
      cardNumberStr: row.cardNumber,
      grade: row.grade,
      numericGrade: extractNumericGrade(row.grade),
    };

    if (row.isProcessingFailure) {
      preview.push({
        ...base,
        status: "skip-processing-failure",
        matchedCardId: null,
        matchedParallelId: null,
        matchedSetName: null,
        matchedParallelName: null,
      });
      continue;
    }

    // Cert dedupe within file — keep first occurrence only.
    if (seenCertsInFile.has(row.certNumber)) {
      preview.push({
        ...base,
        status: "skip-dup-cert-in-file",
        matchedCardId: null,
        matchedParallelId: null,
        matchedSetName: null,
        matchedParallelName: null,
      });
      continue;
    }
    seenCertsInFile.add(row.certNumber);

    // Cert already exists in DB.
    if (existingCertSet.has(row.certNumber)) {
      preview.push({
        ...base,
        status: "skip-dup-cert-in-db",
        matchedCardId: null,
        matchedParallelId: null,
        matchedSetName: null,
        matchedParallelName: null,
      });
      continue;
    }

    // Match set by year + brand (case-insensitive substring).
    if (!row.brand || !row.year) {
      preview.push({
        ...base,
        status: "no-set",
        matchedCardId: null,
        matchedParallelId: null,
        matchedSetName: null,
        matchedParallelName: null,
      });
      continue;
    }

    const brandLower = row.brand.toLowerCase();
    // Strip leading year prefix ("2024 ", "2023-24 ") from set name before comparing,
    // so "Topps Chrome MLS" matches "2024 Topps Chrome MLS" but not "2024 Topps Chrome MLS Mania".
    const matchedSet = allSets.find((s) => {
      if (s.year !== row.year) return false;
      const nameNoYear = s.name.replace(/^\d{4}(-\d{2,4})?\s+/, "").toLowerCase();
      return nameNoYear === brandLower;
    });

    if (!matchedSet) {
      preview.push({
        ...base,
        status: "no-set",
        matchedCardId: null,
        matchedParallelId: null,
        matchedSetName: null,
        matchedParallelName: null,
      });
      continue;
    }

    // Match card by card number (card numbers are unique within a set).
    if (!row.cardNumber) {
      preview.push({
        ...base,
        status: "no-card",
        matchedCardId: null,
        matchedParallelId: null,
        matchedSetName: matchedSet.name,
        matchedParallelName: null,
      });
      continue;
    }

    const matchedCard = await prisma.card.findFirst({
      where: {
        setId: matchedSet.id,
        cardNumber: row.cardNumber,
        retired: false,
      },
      select: { id: true, subset: true },
    });

    if (!matchedCard) {
      preview.push({
        ...base,
        status: "no-card",
        matchedCardId: null,
        matchedParallelId: null,
        matchedSetName: matchedSet.name,
        matchedParallelName: null,
      });
      continue;
    }

    // Match parallel by normalized name similarity.
    let matchedParallelId: string | null = null;
    let matchedParallelName: string | null = null;

    if (row.variation) {
      const parallels = await prisma.parallel.findMany({
        where: { setId: matchedSet.id, subset: matchedCard.subset, isBase: false },
        select: { id: true, name: true },
      });

      const scoreBest = (variation: string) => {
        let best = 0;
        let bestP: { id: string; name: string } | null = null;
        for (const p of parallels) {
          const s = parallelScore(variation, p.name);
          if (s > best) { best = s; bestP = p; }
        }
        return { score: best, parallel: bestP };
      };

      // Try the original variation first.
      let { score: bestScore, parallel: bestParallel } = scoreBest(row.variation);

      // Fallback for Sapphire sets: some subsets use "X Sapphire" instead of "X Refractor".
      // If the original didn't match, translate and retry.
      if (bestScore < 0.5 && matchedSet.name.toLowerCase().includes("sapphire")) {
        const translated = row.variation.replace(/\bRefractors?\b/gi, "Sapphire");
        const fallback = scoreBest(translated);
        if (fallback.score > bestScore) {
          bestScore = fallback.score;
          bestParallel = fallback.parallel;
        }
      }

      if (bestParallel && bestScore >= 0.5) {
        matchedParallelId = bestParallel.id;
        matchedParallelName = bestParallel.name;
      }
    }

    preview.push({
      ...base,
      status: row.variation && !matchedParallelId ? "ok-no-parallel" : "ok",
      matchedCardId: matchedCard.id,
      matchedParallelId,
      matchedSetName: matchedSet.name,
      matchedParallelName,
    });
  }

  return preview;
}

export async function confirmTagImport(
  rows: PreviewRow[],
): Promise<{ imported: number }> {
  const toImport = rows.filter(
    (r) =>
      (r.status === "ok" || r.status === "ok-no-parallel") && r.matchedCardId,
  );

  if (toImport.length === 0) return { imported: 0 };

  await prisma.collectionItem.createMany({
    data: toImport.map((r) => ({
      cardId: r.matchedCardId!,
      parallelId: r.matchedParallelId,
      status: "OWNED" as const,
      gradingCompany: "TAG" as const,
      grade: r.numericGrade,
      certNumber: r.certNumber,
    })),
  });

  revalidatePath("/", "layout");
  return { imported: toImport.length };
}
