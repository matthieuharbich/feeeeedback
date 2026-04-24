import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { verifyApiKey } from "./api-keys";

export type ApiContext = {
  user: { id: string; email: string; name: string };
};

export async function authenticateApi(req: Request): Promise<ApiContext | NextResponse> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (session?.user) {
    return { user: { id: session.user.id, email: session.user.email, name: session.user.name } };
  }

  const apiKeyHeader = req.headers.get("x-api-key");
  if (!apiKeyHeader) return json({ error: "unauthorized" }, 401);

  const verified = await verifyApiKey(apiKeyHeader);
  if (!verified) return json({ error: "invalid api key" }, 401);

  const rows = await db.select().from(user).where(eq(user.id, verified.userId)).limit(1);
  if (!rows[0]) return json({ error: "user not found" }, 401);
  return { user: { id: rows[0].id, email: rows[0].email, name: rows[0].name } };
}

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    },
  });
}

export function optionsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}
