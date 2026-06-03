import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { authenticateApi, json, optionsResponse } from "@/lib/server/api-auth";
import { db } from "@/lib/db";
import { comment, member, project } from "@/lib/db/schema";
import { nid } from "@/lib/server/ids";
import { saveScreenshot } from "@/lib/server/uploads";

export const OPTIONS = () => optionsResponse();

const VALID_KINDS = ["feedback", "action"] as const;
type Kind = (typeof VALID_KINDS)[number];
type Attachment = { path: string; kind: Kind; addedAt: string };

async function loadAndAuth(req: NextRequest, id: string) {
  const auth = await authenticateApi(req);
  if (auth instanceof Response) return { auth, error: auth };
  const rows = await db.select().from(comment).where(eq(comment.id, id)).limit(1);
  const c = rows[0];
  if (!c) return { error: json({ error: "comment not found" }, 404) as Response };
  const proj = await db
    .select()
    .from(project)
    .where(eq(project.id, c.projectId))
    .limit(1);
  if (!proj[0]) return { error: json({ error: "project not found" }, 404) as Response };
  const mem = await db
    .select()
    .from(member)
    .where(
      and(
        eq(member.userId, auth.user.id),
        eq(member.organizationId, proj[0].organizationId)
      )
    )
    .limit(1);
  if (!mem[0]) return { error: json({ error: "not a member" }, 403) as Response };
  return { auth, comment: c };
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const loaded = await loadAndAuth(req, id);
  if (loaded.error) return loaded.error;
  const c = loaded.comment!;

  const form = await req.formData();
  const kindRaw = String(form.get("kind") || "action");
  const kind: Kind = VALID_KINDS.includes(kindRaw as Kind)
    ? (kindRaw as Kind)
    : "action";
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return json({ error: "file required" }, 400);
  }
  if (file.size > 6 * 1024 * 1024) {
    return json({ error: "file too large (max 6 MB)" }, 400);
  }

  const aid = nid();
  const buffer = Buffer.from(await file.arrayBuffer());
  const path = await saveScreenshot(aid, buffer);
  const newAtt: Attachment = {
    path,
    kind,
    addedAt: new Date().toISOString(),
  };
  const next = [...((c.attachments as Attachment[]) || []), newAtt];
  await db.update(comment).set({ attachments: next }).where(eq(comment.id, id));
  return json({ attachment: newAtt, attachments: next });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const loaded = await loadAndAuth(req, id);
  if (loaded.error) return loaded.error;
  const c = loaded.comment!;

  const path = new URL(req.url).searchParams.get("path");
  if (!path) return json({ error: "path required" }, 400);
  const next = ((c.attachments as Attachment[]) || []).filter(
    (a) => a.path !== path
  );
  await db.update(comment).set({ attachments: next }).where(eq(comment.id, id));
  return json({ attachments: next });
}
