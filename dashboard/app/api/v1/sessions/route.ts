import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { authenticateApi, json, optionsResponse } from "@/lib/server/api-auth";
import { db } from "@/lib/db";
import { feedbackSession, member, project } from "@/lib/db/schema";
import { nid } from "@/lib/server/ids";

export const OPTIONS = () => optionsResponse();

export async function POST(req: NextRequest) {
  const ctx = await authenticateApi(req);
  if (ctx instanceof Response) return ctx;

  const body = await req.json();
  const { projectId, title, startUrl, startTitle } = body || {};
  if (!projectId) return json({ error: "projectId required" }, 400);

  const projRows = await db.select().from(project).where(eq(project.id, projectId)).limit(1);
  const proj = projRows[0];
  if (!proj) return json({ error: "project not found" }, 404);

  const mem = await db
    .select()
    .from(member)
    .where(and(eq(member.userId, ctx.user.id), eq(member.organizationId, proj.organizationId)))
    .limit(1);
  if (!mem[0]) return json({ error: "not a member" }, 403);

  const id = nid();
  await db.insert(feedbackSession).values({
    id,
    projectId,
    authorId: ctx.user.id,
    title: title || null,
    startUrl: startUrl || null,
    startTitle: startTitle || null,
  });

  return json({ session: { id, projectId, startUrl, startTitle, startedAt: new Date().toISOString() } });
}
