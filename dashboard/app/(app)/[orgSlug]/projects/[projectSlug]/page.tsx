import Link from "next/link";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { comment, feedbackSession, project, user } from "@/lib/db/schema";
import { requireSession, getOrgBySlug } from "@/lib/server/session";
import { getProjectScope } from "@/lib/server/access";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InboxClient } from "../../inbox/inbox-client";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const session = await requireSession();
  const org = await getOrgBySlug(orgSlug);
  if (!org) return null;

  const proj = await db
    .select()
    .from(project)
    .where(
      and(eq(project.organizationId, org.id), eq(project.slug, projectSlug))
    )
    .limit(1);
  if (!proj[0]) {
    return (
      <div className="px-6 md:px-10 py-8 max-w-[1500px] mx-auto">
        Project not found.
      </div>
    );
  }

  // Access control: non-owners must have a project_member row
  const scope = await getProjectScope(session.user.id, org.id);
  if (!scope.all && !scope.projectIds.includes(proj[0].id)) {
    return (
      <div className="px-6 md:px-10 py-8 max-w-[1500px] mx-auto">
        <p className="text-sm text-muted-foreground">
          You don&apos;t have access to this project.
        </p>
      </div>
    );
  }

  const projectsList = [
    {
      id: proj[0].id,
      name: proj[0].name,
      slug: proj[0].slug,
      color: proj[0].color,
    },
  ];

  const rows = await db
    .select({
      id: comment.id,
      comment: comment.comment,
      selector: comment.selector,
      text: comment.text,
      tagName: comment.tagName,
      url: comment.url,
      pageTitle: comment.pageTitle,
      screenshotPath: comment.screenshotPath,
      screenshotWidth: comment.screenshotWidth,
      screenshotHeight: comment.screenshotHeight,
      viewportWidth: comment.viewportWidth,
      viewportHeight: comment.viewportHeight,
      status: comment.status,
      priority: comment.priority,
      actionNote: comment.actionNote,
      attachments: comment.attachments,
      resolvedAt: comment.resolvedAt,
      createdAt: comment.createdAt,
      projectId: comment.projectId,
      projectName: project.name,
      projectColor: project.color,
      projectSlug: project.slug,
      contributorName: sql<string | null>`COALESCE(${feedbackSession.contributorName}, ${user.name})`,
      authorEmail: user.email,
    })
    .from(comment)
    .innerJoin(project, eq(comment.projectId, project.id))
    .innerJoin(user, eq(comment.authorId, user.id))
    .leftJoin(feedbackSession, eq(comment.sessionId, feedbackSession.id))
    .where(inArray(comment.projectId, [proj[0].id]))
    .orderBy(desc(comment.createdAt))
    .limit(500);

  const serialized = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
  }));

  const patterns = (proj[0].urlPatterns as string[]) || [];

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1500px] mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href={`/${orgSlug}/projects`}>
            <ArrowLeft className="size-4" /> Projects
          </Link>
        </Button>
        <Badge
          variant="outline"
          className="gap-1.5"
          style={{
            background: `${proj[0].color}1a`,
            color: proj[0].color,
            borderColor: `${proj[0].color}33`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: proj[0].color }}
          />
          {proj[0].name}
        </Badge>
      </div>

      <InboxClient
        orgSlug={orgSlug}
        projects={projectsList}
        comments={serialized}
        lockedProjectSlug={proj[0].slug}
        pageTitle={proj[0].name}
        pageDescription={
          patterns.length > 0 ? (
            <span className="font-mono text-xs">{patterns.join(" · ")}</span>
          ) : (
            <span className="text-muted-foreground italic">No URL pattern</span>
          )
        }
      />
    </div>
  );
}
