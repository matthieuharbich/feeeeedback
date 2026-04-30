import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { authenticateApi, json, optionsResponse } from "@/lib/server/api-auth";
import { userIsOrgOwner } from "@/lib/server/access";
import { db } from "@/lib/db";
import {
  member,
  organization,
  project,
  projectMember,
  user,
} from "@/lib/db/schema";
import { nid } from "@/lib/server/ids";

export const OPTIONS = () => optionsResponse();

const VALID_ROLES = ["member", "admin", "owner"] as const;

// Add a user to an org. Body: { orgSlug, role?, projectSlugs?[] }
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApi(req);
  if (auth instanceof Response) return auth;

  const { id: targetUserId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const orgSlug = String(body?.orgSlug || "");
  const role = (VALID_ROLES as readonly string[]).includes(body?.role)
    ? (body.role as string)
    : "member";
  const projectSlugs: string[] = Array.isArray(body?.projectSlugs)
    ? body.projectSlugs
    : [];

  if (!orgSlug) return json({ error: "orgSlug required" }, 400);

  const orgRows = await db
    .select()
    .from(organization)
    .where(eq(organization.slug, orgSlug))
    .limit(1);
  const org = orgRows[0];
  if (!org) return json({ error: "org not found" }, 404);
  if (!(await userIsOrgOwner(auth.user.id, org.id))) {
    return json({ error: "owner-only" }, 403);
  }

  // Verify target user exists
  const targetRows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1);
  if (!targetRows[0]) return json({ error: "user not found" }, 404);

  // Add (or update role) membership
  const existing = await db
    .select()
    .from(member)
    .where(eq(member.userId, targetUserId))
    .limit(50);
  const inOrg = existing.find((m) => m.organizationId === org.id);
  if (inOrg) {
    if (inOrg.role !== role) {
      await db.update(member).set({ role }).where(eq(member.id, inOrg.id));
    }
  } else {
    await db.insert(member).values({
      id: nid(),
      organizationId: org.id,
      userId: targetUserId,
      role,
    });
  }

  // Sync project access
  if (Array.isArray(body?.projectSlugs)) {
    const projects = await db
      .select({ id: project.id, slug: project.slug })
      .from(project)
      .where(eq(project.organizationId, org.id));
    const desired = new Set(
      projects.filter((p) => projectSlugs.includes(p.slug)).map((p) => p.id)
    );

    // Remove existing rows for this user in this org
    const userLinks = await db
      .select({ id: projectMember.id, projectId: projectMember.projectId })
      .from(projectMember)
      .where(eq(projectMember.userId, targetUserId));
    const orgLinkIds = userLinks
      .filter((l) => projects.some((p) => p.id === l.projectId))
      .map((l) => l.id);
    for (const linkId of orgLinkIds) {
      await db.delete(projectMember).where(eq(projectMember.id, linkId));
    }
    for (const pid of desired) {
      await db
        .insert(projectMember)
        .values({ id: nid(), projectId: pid, userId: targetUserId });
    }
  }

  return json({ ok: true, orgSlug, role, projectSlugs });
}
