import { NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { authenticateApi, json, optionsResponse } from "@/lib/server/api-auth";
import { db } from "@/lib/db";
import { member, organization, project } from "@/lib/db/schema";
import { nid, slugify } from "@/lib/server/ids";

export const OPTIONS = () => optionsResponse();

export async function GET(req: NextRequest) {
  const ctx = await authenticateApi(req);
  if (ctx instanceof Response) return ctx;

  const orgRows = await db
    .select({ id: organization.id })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, ctx.user.id));
  const orgIds = orgRows.map((r) => r.id);
  if (!orgIds.length) return json({ projects: [] });

  const projects = await db
    .select({
      id: project.id,
      name: project.name,
      slug: project.slug,
      color: project.color,
      urlPatterns: project.urlPatterns,
      organizationId: project.organizationId,
    })
    .from(project)
    .where(inArray(project.organizationId, orgIds))
    .orderBy(project.name);

  return json({ projects });
}

export async function POST(req: NextRequest) {
  const ctx = await authenticateApi(req);
  if (ctx instanceof Response) return ctx;

  const body = await req.json();
  const { orgSlug, name, slug: inputSlug, color, urlPatterns } = body || {};
  if (!orgSlug || !name) return json({ error: "orgSlug and name required" }, 400);

  const orgRows = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, orgSlug))
    .limit(1);
  const org = orgRows[0];
  if (!org) return json({ error: "org not found" }, 404);

  const mem = await db
    .select()
    .from(member)
    .where(and(eq(member.userId, ctx.user.id), eq(member.organizationId, org.id)))
    .limit(1);
  if (!mem[0]) return json({ error: "not a member" }, 403);

  const finalSlug = slugify(inputSlug || name);
  const id = nid();
  await db.insert(project).values({
    id,
    organizationId: org.id,
    name,
    slug: finalSlug,
    color: color || "#ff6b35",
    urlPatterns: Array.isArray(urlPatterns) ? urlPatterns : [],
    createdBy: ctx.user.id,
  });

  return json({
    project: { id, name, slug: finalSlug, color: color || "#ff6b35", urlPatterns, organizationId: org.id },
  });
}
