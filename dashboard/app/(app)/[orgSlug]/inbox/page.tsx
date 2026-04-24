import { desc, eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { comment, feedbackSession, project, user } from "@/lib/db/schema";
import Link from "next/link";
import { requireSession, getOrgBySlug } from "@/lib/server/session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/page-header";
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
      <div className="px-6 md:px-10 py-8 max-w-[1500px] mx-auto">
        <PageHeader title="Inbox" description="Aucun retour pour l'instant" />
        <Card className="p-16 text-center mt-8">
          <div className="size-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <Inbox className="size-5" />
          </div>
          <h3 className="text-lg font-medium mb-2">Aucun projet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            Crée un projet pour commencer à capturer des retours depuis l'extension.
          </p>
          <Button asChild>
            <Link href={`/${orgSlug}/projects/new`}>Créer un projet</Link>
          </Button>
        </Card>
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
