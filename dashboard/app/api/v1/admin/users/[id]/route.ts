import { NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { authenticateApi, json, optionsResponse } from "@/lib/server/api-auth";
import { userIsOrgOwner } from "@/lib/server/access";
import { db } from "@/lib/db";
import {
  member,
  organization,
  project,
  projectMember,
} from "@/lib/db/schema";
import { nid } from "@/lib/server/ids";

export const OPTIONS = () => optionsResponse();

// PATCH { orgSlug, projectSlugs?[], role? } — replace the user's project
// access for the given org and optionally change the role. Owner/admin only.
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApi(req);
  if (auth instanceof Response) return auth;

  const { id: targetUserId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const orgSlug = String(body?.orgSlug || "");
  const role: string | undefined = ["member", "admin", "owner"].includes(
    body?.role
  )
    ? body.role
    : undefined;
  const projectSlugs: string[] | undefined = Array.isArray(body?.projectSlugs)
    ? body.projectSlugs
    : undefined;
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

  // Verify target is a member of that org
  const targetMem = await db
    .select()
    .from(member)
    .where(
      and(
        eq(member.userId, targetUserId),
        eq(member.organizationId, org.id)
      )
    )
    .limit(1);
  if (!targetMem[0]) return json({ error: "user not in org" }, 404);

  if (role && role !== targetMem[0].role) {
    await db
      .update(member)
      .set({ role })
      .where(eq(member.id, targetMem[0].id));
  }

  if (projectSlugs !== undefined) {
    const projects = await db
      .select({ id: project.id, slug: project.slug })
      .from(project)
      .where(eq(project.organizationId, org.id));
    const desiredIds = projects
      .filter((p) => projectSlugs.includes(p.slug))
      .map((p) => p.id);
    const projectIdsForOrg = projects.map((p) => p.id);

    if (projectIdsForOrg.length) {
      await db
        .delete(projectMember)
        .where(
          and(
            eq(projectMember.userId, targetUserId),
            inArray(projectMember.projectId, projectIdsForOrg)
          )
        );
    }

    for (const pid of desiredIds) {
      await db
        .insert(projectMember)
        .values({ id: nid(), projectId: pid, userId: targetUserId });
    }
  }

  return json({ ok: true, role, projects: projectSlugs });
}

// DELETE removes the user from the org entirely.
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApi(req);
  if (auth instanceof Response) return auth;
  const { id: targetUserId } = await ctx.params;
  const url = new URL(req.url);
  const orgSlug = url.searchParams.get("orgSlug");
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

  // Remove project_member rows for this user/org
  const projects = await db
    .select({ id: project.id })
    .from(project)
    .where(eq(project.organizationId, org.id));
  const projectIds = projects.map((p) => p.id);
  if (projectIds.length) {
    await db
      .delete(projectMember)
      .where(
        and(
          eq(projectMember.userId, targetUserId),
          inArray(projectMember.projectId, projectIds)
        )
      );
  }
  await db
    .delete(member)
    .where(
      and(eq(member.userId, targetUserId), eq(member.organizationId, org.id))
    );

  return json({ ok: true });
}
