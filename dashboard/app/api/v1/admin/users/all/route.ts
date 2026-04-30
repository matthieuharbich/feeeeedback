import { NextRequest } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { authenticateApi, json, optionsResponse } from "@/lib/server/api-auth";
import { db } from "@/lib/db";
import {
  member,
  organization,
  project,
  projectMember,
  user,
} from "@/lib/db/schema";

export const OPTIONS = () => optionsResponse();

/**
 * Cross-org admin view.
 *
 * Returns:
 * - `orgs`: all orgs where the caller is owner/admin (admin scope).
 * - `projects`: projects across those orgs.
 * - `users`: every user that has at least one membership in those orgs,
 *   with per-org memberships (role + project slug list).
 */
export async function GET(req: NextRequest) {
  const ctx = await authenticateApi(req);
  if (ctx instanceof Response) return ctx;

  // Find orgs where caller is owner/admin
  const callerMembers = await db
    .select({
      orgId: member.organizationId,
      role: member.role,
    })
    .from(member)
    .where(eq(member.userId, ctx.user.id));
  const adminOrgIds = callerMembers
    .filter((m) => m.role === "owner" || m.role === "admin")
    .map((m) => m.orgId);
  if (!adminOrgIds.length) return json({ orgs: [], projects: [], users: [] });

  const orgs = await db
    .select({ id: organization.id, slug: organization.slug, name: organization.name })
    .from(organization)
    .where(inArray(organization.id, adminOrgIds))
    .orderBy(organization.name);

  const projects = await db
    .select({
      id: project.id,
      slug: project.slug,
      name: project.name,
      color: project.color,
      organizationId: project.organizationId,
    })
    .from(project)
    .where(inArray(project.organizationId, adminOrgIds))
    .orderBy(project.name);
  const projectIdToInfo = new Map(projects.map((p) => [p.id, p]));

  // Members across these orgs
  const members = await db
    .select({
      memberId: member.id,
      role: member.role,
      orgId: member.organizationId,
      userId: user.id,
      name: user.name,
      email: user.email,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(inArray(member.organizationId, adminOrgIds));

  // Project access links scoped to these projects
  const projectIds = projects.map((p) => p.id);
  const links = projectIds.length
    ? await db
        .select({ projectId: projectMember.projectId, userId: projectMember.userId })
        .from(projectMember)
        .where(inArray(projectMember.projectId, projectIds))
    : [];
  // userId → orgId → set of project slugs
  const accessMap = new Map<string, Map<string, string[]>>();
  for (const l of links) {
    const proj = projectIdToInfo.get(l.projectId);
    if (!proj) continue;
    let perOrg = accessMap.get(l.userId);
    if (!perOrg) {
      perOrg = new Map();
      accessMap.set(l.userId, perOrg);
    }
    const arr = perOrg.get(proj.organizationId) || [];
    arr.push(proj.slug);
    perOrg.set(proj.organizationId, arr);
  }

  // Group members by user
  const usersMap = new Map<
    string,
    {
      userId: string;
      name: string;
      email: string;
      memberships: { orgSlug: string; orgName: string; role: string; projectSlugs: string[] }[];
    }
  >();
  for (const m of members) {
    const orgInfo = orgs.find((o) => o.id === m.orgId);
    if (!orgInfo) continue;
    const projectSlugs = accessMap.get(m.userId)?.get(m.orgId) || [];
    let entry = usersMap.get(m.userId);
    if (!entry) {
      entry = {
        userId: m.userId,
        name: m.name,
        email: m.email,
        memberships: [],
      };
      usersMap.set(m.userId, entry);
    }
    entry.memberships.push({
      orgSlug: orgInfo.slug || "",
      orgName: orgInfo.name,
      role: m.role,
      projectSlugs,
    });
  }
  const users = Array.from(usersMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "fr")
  );

  return json({ orgs, projects, users });
}
