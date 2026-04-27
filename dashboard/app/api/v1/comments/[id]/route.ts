import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { authenticateApi, json, optionsResponse } from "@/lib/server/api-auth";
import { db } from "@/lib/db";
import { comment, member, project } from "@/lib/db/schema";

const VALID_STATUSES = ["open", "in_progress", "resolved", "archived"] as const;
type Status = (typeof VALID_STATUSES)[number];

const VALID_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
type Priority = (typeof VALID_PRIORITIES)[number];

export const OPTIONS = () => optionsResponse();

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApi(req);
  if (auth instanceof Response) return auth;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const status = body?.status as Status | undefined;
  const priority = body?.priority as Priority | undefined;
  const actionNote =
    typeof body?.actionNote === "string" || body?.actionNote === null
      ? (body.actionNote as string | null)
      : undefined;
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return json({ error: "invalid status" }, 400);
  }
  if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
    return json({ error: "invalid priority" }, 400);
  }
  if (status === undefined && priority === undefined && actionNote === undefined) {
    return json({ error: "nothing to update" }, 400);
  }

  // Verify the comment exists and the caller is a member of the owning org
  const rows = await db
    .select({
      id: comment.id,
      projectId: comment.projectId,
      organizationId: project.organizationId,
    })
    .from(comment)
    .innerJoin(project, eq(comment.projectId, project.id))
    .where(eq(comment.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return json({ error: "not found" }, 404);

  const mem = await db
    .select()
    .from(member)
    .where(
      and(eq(member.userId, auth.user.id), eq(member.organizationId, row.organizationId))
    )
    .limit(1);
  if (!mem[0]) return json({ error: "not a member" }, 403);

  const updates: Record<string, unknown> = {};
  if (status !== undefined) {
    updates.status = status;
    if (status === "resolved") {
      updates.resolvedAt = new Date();
      updates.resolvedBy = auth.user.id;
    } else if (status === "open" || status === "in_progress") {
      updates.resolvedAt = null;
      updates.resolvedBy = null;
    }
  }
  if (priority !== undefined) {
    updates.priority = priority;
  }
  if (actionNote !== undefined) {
    updates.actionNote = actionNote ? actionNote.trim() : null;
  }

  await db.update(comment).set(updates).where(eq(comment.id, id));
  return json({ id, status, priority, actionNote });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApi(req);
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  const rows = await db
    .select({
      id: comment.id,
      projectId: comment.projectId,
      organizationId: project.organizationId,
    })
    .from(comment)
    .innerJoin(project, eq(comment.projectId, project.id))
    .where(eq(comment.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return json({ error: "not found" }, 404);
  const mem = await db
    .select()
    .from(member)
    .where(
      and(eq(member.userId, auth.user.id), eq(member.organizationId, row.organizationId))
    )
    .limit(1);
  if (!mem[0]) return json({ error: "not a member" }, 403);
  await db.delete(comment).where(eq(comment.id, id));
  return json({ ok: true });
}
