import { createHash, randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apikey } from "@/lib/db/schema";
import { nid } from "./ids";

const PREFIX = "ffd_";

export function generateApiKey() {
  const raw = randomBytes(24).toString("base64url");
  return PREFIX + raw;
}

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export async function createApiKey(userId: string, name = "extension") {
  const key = generateApiKey();
  const hashed = hashKey(key);
  const id = nid();
  await db.insert(apikey).values({
    id,
    userId,
    name,
    key: hashed,
    prefix: PREFIX,
    start: key.slice(0, 8),
    enabled: true,
  });
  return { id, key };
}

export async function verifyApiKey(key: string) {
  if (!key?.startsWith(PREFIX)) return null;
  const hashed = hashKey(key);
  const rows = await db.select().from(apikey).where(eq(apikey.key, hashed)).limit(1);
  const row = rows[0];
  if (!row || row.enabled === false) return null;
  if (row.expiresAt && row.expiresAt < new Date()) return null;
  return { id: row.id, userId: row.userId };
}
