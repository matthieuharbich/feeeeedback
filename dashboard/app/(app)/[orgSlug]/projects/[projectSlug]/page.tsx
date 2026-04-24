import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { comment, feedbackSession, project, user } from "@/lib/db/schema";
import { requireSession, getOrgBySlug } from "@/lib/server/session";
import { ArrowLeft, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { ContributorAvatar } from "@/components/contributor-avatar";
import { shortUrl, timeAgo } from "@/lib/utils";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  await requireSession();
  const org = await getOrgBySlug(orgSlug);
  if (!org) return null;

  const proj = await db
    .select()
    .from(project)
    .where(and(eq(project.organizationId, org.id), eq(project.slug, projectSlug)))
    .limit(1);
  if (!proj[0])
    return (
      <div className="px-6 md:px-10 py-8 max-w-[1500px] mx-auto">
        Projet introuvable.
      </div>
    );

  const rows = await db
    .select({
      id: comment.id,
      comment: comment.comment,
      url: comment.url,
      screenshotPath: comment.screenshotPath,
      createdAt: comment.createdAt,
      contributorName: sql<string | null>`COALESCE(${feedbackSession.contributorName}, ${user.name})`,
    })
    .from(comment)
    .innerJoin(user, eq(comment.authorId, user.id))
    .leftJoin(feedbackSession, eq(comment.sessionId, feedbackSession.id))
    .where(eq(comment.projectId, proj[0].id))
    .orderBy(desc(comment.createdAt))
    .limit(200);

  const patterns = (proj[0].urlPatterns as string[]) || [];
  const color = proj[0].color;

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1500px] mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
        <Link href={`/${orgSlug}/projects`}>
          <ArrowLeft className="size-4" /> Projets
        </Link>
      </Button>

      <PageHeader
        title={proj[0].name}
        description={
          patterns.length > 0 ? (
            <span className="font-mono">{patterns.join(" · ")}</span>
          ) : (
            <span className="text-muted-foreground italic">
              Aucun pattern d'URL
            </span>
          )
        }
        actions={
          <Badge
            variant="outline"
            className="gap-1.5"
            style={{ background: `${color}1a`, color, borderColor: `${color}33` }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            {rows.length} retour{rows.length > 1 ? "s" : ""}
          </Badge>
        }
      />

      {rows.length === 0 ? (
        <Card className="p-16 text-center mt-8">
          <div className="size-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <Inbox className="size-5" />
          </div>
          <h3 className="text-lg font-medium mb-2">Aucun retour</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Lance une session dans l'extension sur une page qui matche ce projet.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/${orgSlug}/inbox?q=${encodeURIComponent(r.comment.slice(0, 30))}`}
              className="group"
            >
              <Card className="overflow-hidden hover:shadow-md hover:border-foreground/10 transition-all p-0 gap-0">
                <div
                  className="h-44 border-b"
                  style={{
                    background:
                      "repeating-conic-gradient(color-mix(in srgb, var(--muted) 90%, transparent) 0% 25%, var(--muted) 0% 50%) 50% / 12px 12px",
                  }}
                >
                  {r.screenshotPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/v1/uploads/${r.screenshotPath}`}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      Pas de capture
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <p className="text-sm leading-relaxed line-clamp-3">{r.comment}</p>
                  <div className="mt-3 text-xs text-muted-foreground truncate">
                    {shortUrl(r.url)}
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ContributorAvatar name={r.contributorName} size={20} />
                      <span className="text-xs truncate">
                        {r.contributorName || "—"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(r.createdAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
