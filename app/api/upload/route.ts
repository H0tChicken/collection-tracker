import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveUpload } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Upload a card image. FormData: file, and one of cardId | collectionItemId.
 * Stores the file under UPLOAD_DIR and records a CardImage row.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const cardId = form.get("cardId") ? String(form.get("cardId")) : null;
    const collectionItemId = form.get("collectionItemId")
      ? String(form.get("collectionItemId"))
      : null;
    if (!file) {
      return NextResponse.json({ ok: false, error: "No file." }, { status: 400 });
    }
    const filename = await saveUpload(file);
    const image = await prisma.cardImage.create({
      data: { path: filename, cardId, collectionItemId, isPrimary: true },
    });
    return NextResponse.json({ ok: true, image });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
