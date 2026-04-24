import { mkdir, writeFile, readFile, stat } from "fs/promises";
import path from "path";

const UPLOADS_DIR = process.env.UPLOADS_DIR || "./uploads";

export async function ensureUploadsDir() {
  await mkdir(UPLOADS_DIR, { recursive: true });
}

export async function saveScreenshot(id: string, buffer: Buffer) {
  await ensureUploadsDir();
  const filename = `${id}.png`;
  const full = path.join(UPLOADS_DIR, filename);
  await writeFile(full, buffer);
  return filename;
}

export async function readScreenshot(filename: string) {
  const full = path.join(UPLOADS_DIR, path.basename(filename));
  const s = await stat(full).catch(() => null);
  if (!s) return null;
  return readFile(full);
}

export function uploadPath(filename: string) {
  return `/api/v1/uploads/${encodeURIComponent(filename)}`;
}
