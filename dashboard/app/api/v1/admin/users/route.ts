import { NextRequest } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { authenticateApi, json, optionsResponse } from "@/lib/server/api-auth";
import { userIsOrgOwner } from "@/lib/server/access";
import { db } from "@/lib/db";
import {
  account,
  member,
  organization,
  project,
  projectMember,
  user,
} from "@/lib/db/schema";
import { nid, slugify } from "@/lib/server/ids";

export const OPTIONS = () => optionsResponse();

const SYNTHETIC_DOMAIN = "@local.feeeeedback";

export async function POST(req: NextRequest) {
  const ctx = await authenticateApi(req);
  if (ctx instanceof Response) return ctx;

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  const password = String(body?.password || "");
  const orgSlug = String(body?.orgSlug || "").trim();
  const projectSlugs: string[] = Array.isArray(body?.projectSlugs)
    ? body.projectSlugs.map((s: string) => String(s).trim()).filter(Boolean)
    : [];

  if (!name || !password || !orgSlug) {
    return json(
      { error: "name, password and orgSlug are required" },
      400
    );
  }
  if (password.length < 4) {
    return json({ error: "password too short" }, 400);
  }

  // Resolve org and verify caller is owner/admin
  const orgRows = await db
    .select()
    .from(organization)
    .where(eq(organization.slug, orgSlug))
    .limit(1);
  const org = orgRows[0];
  if (!org) return json({ error: "org not found" }, 404);
  if (!(await userIsOrgOwner(ctx.user.id, org.id))) {
    return json({ error: "only org owners/admins can create users" }, 403);
  }

  // Pick a unique synthetic email; suffix `-2`, `-3`… if needed.
  const baseSlug = slugify(name) || nid(8);
  let attempt = 0;
  let email = `${baseSlug}${SYNTHETIC_DOMAIN}`;
  while (
    (await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1))[0]
  ) {
    attempt++;
    email = `${baseSlug}-${attempt + 1}${SYNTHETIC_DOMAIN}`;
    if (attempt > 100) return json({ error: "could not pick unique email" }, 500);
  }

  const userId = nid();
  await db.insert(user).values({
    id: userId,
    name,
    email,
    emailVerified: true,
  });

  const hashed = await hashPassword(password);
  await db.insert(account).values({
    id: nid(),
    userId,
    accountId: userId,
    providerId: "credential",
    password: hashed,
  });

  await db.insert(member).values({
    id: nid(),
    organizationId: org.id,
    userId,
    role: "member",
  });

  if (projectSlugs.length > 0) {
    const projects = await db
      .select({ id: project.id, slug: project.slug })
      .from(project)
      .where(eq(project.organizationId, org.id));
    const matchingIds = projects
      .filter((p) => projectSlugs.includes(p.slug))
      .map((p) => p.id);
    for (const pid of matchingIds) {
      await db
        .insert(projectMember)
        .values({ id: nid(), projectId: pid, userId });
    }
  }

  return json({
    id: userId,
    name,
    email,
    orgSlug: org.slug,
    projects: projectSlugs,
  });
}

export async function GET(req: NextRequest) {
  const ctx = await authenticateApi(req);
  if (ctx instanceof Response) return ctx;

  const orgSlug = new URL(req.url).searchParams.get("orgSlug");
  if (!orgSlug) return json({ error: "orgSlug required" }, 400);
  const orgRows = await db
    .select()
    .from(organization)
    .where(eq(organization.slug, orgSlug))
    .limit(1);
  const org = orgRows[0];
  if (!org) return json({ error: "org not found" }, 404);
  if (!(await userIsOrgOwner(ctx.user.id, org.id))) {
    return json({ error: "owner-only" }, 403);
  }

  const members = await db
    .select({
      memberId: member.id,
      role: member.role,
      userId: user.id,
      name: user.name,
      email: user.email,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, org.id));

  const projects = await db
    .select({ id: project.id, slug: project.slug })
    .from(project)
    .where(eq(project.organizationId, org.id));
  const projectIds = projects.map((p) => p.id);

  const links = projectIds.length
    ? await db
        .select({ projectId: projectMember.projectId, userId: projectMember.userId })
        .from(projectMember)
        .where(inArray(projectMember.projectId, projectIds))
    : [];
  const userToProjectSlugs = new Map<string, string[]>();
  for (const l of links) {
    const proj = projects.find((p) => p.id === l.projectId);
    if (!proj) continue;
    const arr = userToProjectSlugs.get(l.userId) || [];
    arr.push(proj.slug);
    userToProjectSlugs.set(l.userId, arr);
  }

  return json({
    members: members.map((m) => ({
      ...m,
      projectSlugs: userToProjectSlugs.get(m.userId) || [],
    })),
  });
}
