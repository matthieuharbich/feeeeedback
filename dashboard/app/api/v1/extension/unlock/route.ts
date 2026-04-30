import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { json, optionsResponse } from "@/lib/server/api-auth";
import { db } from "@/lib/db";
import { member, organization, user } from "@/lib/db/schema";
import { getUserOrgs } from "@/lib/server/session";
import { nid } from "@/lib/server/ids";

const EXTENSION_EMAIL = "extension@feeeeedback.local";

export const OPTIONS = () => optionsResponse();

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = typeof body?.password === "string" ? body.password : "";
  const expected = process.env.EXTENSION_PASSWORD || "apolo";

  if (!password || password !== expected) {
    return json({ error: "Mot de passe incorrect" }, 401);
  }

  const token = process.env.EXTENSION_BEARER_TOKEN;
  if (!token) {
    return json({ error: "server misconfigured: EXTENSION_BEARER_TOKEN not set" }, 500);
  }

  // Ensure extension user exists
  let rows = await db.select().from(user).where(eq(user.email, EXTENSION_EMAIL)).limit(1);
  if (!rows[0]) {
    const id = nid();
    await db.insert(user).values({
      id,
      email: EXTENSION_EMAIL,
      name: "Extension",
      emailVerified: true,
    });
    rows = [
      {
        id,
        email: EXTENSION_EMAIL,
        name: "Extension",
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }
  const extUser = rows[0];

  // Ensure extension user is admin of every org so it sees every project
  // regardless of project_member rows (it's the shared account used by all
  // contributors via the unlock password — needs full org visibility).
  const allOrgs = await db.select().from(organization);
  for (const org of allOrgs) {
    const existing = await db
      .select()
      .from(member)
      .where(and(eq(member.userId, extUser.id), eq(member.organizationId, org.id)))
      .limit(1);
    if (!existing[0]) {
      await db.insert(member).values({
        id: nid(),
        organizationId: org.id,
        userId: extUser.id,
        role: "admin",
      });
    } else if (existing[0].role !== "admin" && existing[0].role !== "owner") {
      await db
        .update(member)
        .set({ role: "admin" })
        .where(eq(member.id, existing[0].id));
    }
  }

  const orgs = await getUserOrgs(extUser.id);

  return json({
    apiKey: token,
    user: {
      id: extUser.id,
      name: extUser.name,
      email: extUser.email,
      image: null,
    },
    orgs,
  });
}
