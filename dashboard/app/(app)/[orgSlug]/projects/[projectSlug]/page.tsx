import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { comment, feedbackSession, project, user } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { requireSession, getOrgBySlug } from "@/lib/server/session";
import { Avatar } from "@/components/avatar";
import { EmptyState } from "@/components/empty-state";
import { formatDate, shortUrl } from "@/lib/utils";

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
  if (!proj[0]) return <div className="p-10">Projet introuvable.</div>;

  const rows = await db
    .select({
      id: comment.id,
      comment: comment.comment,
      selector: comment.selector,
      url: comment.url,
      screenshotPath: comment.screenshotPath,
      createdAt: comment.createdAt,
      contributorName: sql<string | null>`COALESCE(${feedbackSession.contributorName}, ${user.name})`,
      authorName: user.name,
      authorEmail: user.email,
      authorImage: user.image,
    })
    .from(comment)
    .innerJoin(user, eq(comment.authorId, user.id))
    .leftJoin(feedbackSession, eq(comment.sessionId, feedbackSession.id))
    .where(eq(comment.projectId, proj[0].id))
    .orderBy(desc(comment.createdAt))
    .limit(100);

  const patterns = (proj[0].urlPatterns as string[]) || [];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <Link
        href={`/${orgSlug}/projects`}
        className="text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] mb-4 inline-block"
      >
        ← Projets
      </Link>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-full" style={{ background: proj[0].color }} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{proj[0].name}</h1>
            {patterns.length > 0 && (
              <div className="text-xs text-[color:var(--color-ink-muted)] font-mono mt-1">
                {patterns.join(" · ")}
              </div>
            )}
          </div>
        </div>
        <Link
          href={`/${orgSlug}/projects/${projectSlug}/settings`}
          className="text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
        >
          Réglages
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Aucun retour"
          description="Lance une session dans l'extension sur une page qui matche ce projet."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => (
            <article key={r.id} className="bg-white border border-[color:var(--color-line)] rounded-2xl overflow-hidden">
              <div className="aspect-[4/3] bg-[color:var(--color-surface-2)]">
                {r.screenshotPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/v1/uploads/${r.screenshotPath}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[color:var(--color-ink-muted)]">(pas de capture)</div>
                )}
              </div>
              <div className="p-4">
                <p className="text-sm leading-relaxed line-clamp-3">{r.comment}</p>
                <div className="mt-3 text-xs text-[color:var(--color-ink-muted)] truncate">{shortUrl(r.url)}</div>
                <div className="mt-3 pt-3 border-t border-[color:var(--color-line)] flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar
                      name={r.contributorName || r.authorName}
                      email={r.authorEmail}
                      image={r.authorImage}
                      size={20}
                    />
                    <span className="text-xs text-[color:var(--color-ink-muted)] truncate">
                      {r.contributorName || r.authorName}
                    </span>
                  </div>
                  <span className="text-xs text-[color:var(--color-ink-muted)]">{formatDate(r.createdAt)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
