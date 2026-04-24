import { NextRequest } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { authenticateApi, json, optionsResponse } from "@/lib/server/api-auth";
import { db } from "@/lib/db";
import { member, organization, project } from "@/lib/db/schema";
import { matchAnyPattern } from "@/lib/server/url-match";

export const OPTIONS = () => optionsResponse();

export async function GET(req: NextRequest) {
  const ctx = await authenticateApi(req);
  if (ctx instanceof Response) return ctx;

  const url = new URL(req.url).searchParams.get("url");
  if (!url) return json({ error: "url required" }, 400);

  const orgRows = await db
    .select({ id: organization.id, name: organization.name, slug: organization.slug })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, ctx.user.id));
  const orgIds = orgRows.map((r) => r.id);
  if (!orgIds.length) return json({ matches: [], all: [] });

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
    .where(inArray(project.organizationId, orgIds));

  const matches = projects.filter((p) => matchAnyPattern(p.urlPatterns as string[], url));
  return json({
    matches,
    all: projects,
    orgs: orgRows,
  });
}
