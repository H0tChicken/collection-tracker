import { promises as fs } from "node:fs";
import path from "node:path";

/** Absolute path to the upload directory (configurable, mounted in Docker). */
export function uploadDir(): string {
  return path.resolve(process.env.UPLOAD_DIR ?? "./data/uploads");
}

export function maxUploadBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB ?? "15");
  return (Number.isFinite(mb) ? mb : 15) * 1024 * 1024;
}

const ALLOWED = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

/** Persist an uploaded image and return its stored relative filename. */
export async function saveUpload(file: File): Promise<string> {
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED.has(ext)) {
    throw new Error(`Unsupported image type: ${ext || "unknown"}`);
  }
  if (file.size > maxUploadBytes()) {
    throw new Error("File exceeds the maximum upload size.");
  }
  const dir = uploadDir();
  await fs.mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, name), buffer);
  return name;
}

/** Read a stored upload by filename (guards against path traversal). */
export async function readUpload(name: string): Promise<Buffer> {
  const safe = path.basename(name);
  return fs.readFile(path.join(uploadDir(), safe));
}
