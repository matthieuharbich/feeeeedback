import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { authenticateApi, json, optionsResponse } from "@/lib/server/api-auth";
import { db } from "@/lib/db";
import { comment, feedbackSession, member, project } from "@/lib/db/schema";
import { nid } from "@/lib/server/ids";
import { saveScreenshot } from "@/lib/server/uploads";

export const OPTIONS = () => optionsResponse();

export async function POST(req: NextRequest) {
  const ctx = await authenticateApi(req);
  if (ctx instanceof Response) return ctx;

  const form = await req.formData();
  const sessionId = String(form.get("sessionId") || "");
  const projectId = String(form.get("projectId") || "");
  const text = (form.get("comment") as string) || "";
  const selector = (form.get("selector") as string) || "";
  const url = (form.get("url") as string) || "";
  if (!sessionId || !projectId || !text || !selector || !url) {
    return json({ error: "missing fields" }, 400);
  }

  // Verify session + project membership
  const projRows = await db.select().from(project).where(eq(project.id, projectId)).limit(1);
  const proj = projRows[0];
  if (!proj) return json({ error: "project not found" }, 404);

  const mem = await db
    .select()
    .from(member)
    .where(and(eq(member.userId, ctx.user.id), eq(member.organizationId, proj.organizationId)))
    .limit(1);
  if (!mem[0]) return json({ error: "not a member" }, 403);

  const ses = await db.select().from(feedbackSession).where(eq(feedbackSession.id, sessionId)).limit(1);
  if (!ses[0]) return json({ error: "session not found" }, 404);

  // Screenshot (optional)
  const screenshot = form.get("screenshot");
  let screenshotPath: string | null = null;
  let screenshotWidth: number | null = null;
  let screenshotHeight: number | null = null;
  if (screenshot instanceof File) {
    const id = nid();
    const buffer = Buffer.from(await screenshot.arrayBuffer());
    screenshotPath = await saveScreenshot(id, buffer);
    screenshotWidth = Number(form.get("screenshotWidth")) || null;
    screenshotHeight = Number(form.get("screenshotHeight")) || null;
  }

  const id = nid();
  const pageTitle = (form.get("pageTitle") as string) || null;
  const tagName = (form.get("tagName") as string) || null;
  const elementText = (form.get("text") as string) || null;
  const viewportWidth = Number(form.get("viewportWidth")) || null;
  const viewportHeight = Number(form.get("viewportHeight")) || null;
  const rawPriority = (form.get("priority") as string) || "";
  const priority = ["low", "normal", "high", "urgent"].includes(rawPriority)
    ? rawPriority
    : "normal";
  let elementRect: { x: number; y: number; width: number; height: number } | null = null;
  try {
    const rectStr = form.get("elementRect") as string;
    if (rectStr) elementRect = JSON.parse(rectStr);
  } catch {}

  await db.insert(comment).values({
    id,
    sessionId,
    projectId,
    authorId: ctx.user.id,
    comment: text,
    selector,
    tagName,
    text: elementText,
    url,
    pageTitle,
    viewportWidth,
    viewportHeight,
    elementRect,
    screenshotPath,
    screenshotWidth,
    screenshotHeight,
    priority,
  });

  return json({ comment: { id, sessionId, projectId, createdAt: new Date().toISOString() } });
}
