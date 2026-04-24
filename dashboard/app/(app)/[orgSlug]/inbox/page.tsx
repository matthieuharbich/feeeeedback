import { desc, eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { comment, feedbackSession, project, user } from "@/lib/db/schema";
import { requireSession, getOrgBySlug } from "@/lib/server/session";
import { EmptyState } from "@/components/empty-state";
import { InboxClient } from "./inbox-client";

export default async function InboxPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await requireSession();
  const org = await getOrgBySlug(orgSlug);
  if (!org) return null;

  const projects = await db
    .select({ id: project.id, name: project.name, slug: project.slug, color: project.color })
    .from(project)
    .where(eq(project.organizationId, org.id))
    .orderBy(project.name);

  if (!projects.length) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight mb-8">Inbox</h1>
        <EmptyState
          title="Aucun projet"
          description="Crée un projet pour commencer à capturer des retours depuis l'extension."
          action={{ label: "Créer un projet", href: `/${orgSlug}/projects/new` }}
        />
      </div>
    );
  }

  const projectIds = projects.map((p) => p.id);

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
    .where(inArray(comment.projectId, projectIds))
    .orderBy(desc(comment.createdAt))
    .limit(500);

  // Serialize dates for client component
  const serialized = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <InboxClient
      orgSlug={orgSlug}
      projects={projects}
      comments={serialized}
    />
  );
}
