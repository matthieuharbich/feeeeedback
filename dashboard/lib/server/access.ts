import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { member, project, projectMember } from "@/lib/db/schema";

/**
 * Per-org access rules:
 * - org owner = sees everything (all projects, all comments, can manage members)
 * - non-owner member = sees only the projects in `project_member` linking them.
 */

export async function userIsOrgOwner(userId: string, orgId: string) {
  const rows = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, orgId)))
    .limit(1);
  const role = rows[0]?.role;
  return role === "owner" || role === "admin";
}

export async function userOrgRole(userId: string, orgId: string) {
  const rows = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, orgId)))
    .limit(1);
  return rows[0]?.role || null;
}

/**
 * Returns the list of project IDs the user can see in this org.
 * Returns `null` when the user can see ALL projects (owner/admin).
 * Returns `[]` when the user has no project access.
 */
export async function userProjectIds(
  userId: string,
  orgId: string
): Promise<string[] | null> {
  const role = await userOrgRole(userId, orgId);
  if (!role) return [];
  if (role === "owner" || role === "admin") return null;
  const rows = await db
    .select({ id: projectMember.projectId })
    .from(projectMember)
    .innerJoin(project, eq(project.id, projectMember.projectId))
    .where(and(eq(projectMember.userId, userId), eq(project.organizationId, orgId)));
  return rows.map((r) => r.id);
}

/**
 * Filter helper: given org id and user id, return either { all: true } or
 * { projectIds: string[] } describing what the user can access.
 */
export async function getProjectScope(userId: string, orgId: string) {
  const ids = await userProjectIds(userId, orgId);
  if (ids === null) return { all: true as const };
  return { all: false as const, projectIds: ids };
}
