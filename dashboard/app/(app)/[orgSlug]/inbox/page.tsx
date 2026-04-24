import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { comment, feedbackSession, project, user } from "@/lib/db/schema";
import { requireSession, getOrgBySlug } from "@/lib/server/session";
import { Avatar } from "@/components/avatar";
import { EmptyState } from "@/components/empty-state";
import { formatDate, shortUrl } from "@/lib/utils";

export default async function InboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ project?: string; author?: string }>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
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

  const selectedProject = sp.project ? projects.find((p) => p.slug === sp.project) : null;
  const projectIds = selectedProject ? [selectedProject.id] : projects.map((p) => p.id);

  const commentsBase = db
    .select({
      id: comment.id,
      comment: comment.comment,
      selector: comment.selector,
      text: comment.text,
      url: comment.url,
      pageTitle: comment.pageTitle,
      screenshotPath: comment.screenshotPath,
      screenshotWidth: comment.screenshotWidth,
      screenshotHeight: comment.screenshotHeight,
      createdAt: comment.createdAt,
      projectId: comment.projectId,
      projectName: project.name,
      projectColor: project.color,
      projectSlug: project.slug,
      authorId: user.id,
      authorName: user.name,
      authorEmail: user.email,
      authorImage: user.image,
    })
    .from(comment)
    .innerJoin(project, eq(comment.projectId, project.id))
    .innerJoin(user, eq(comment.authorId, user.id));

  const rows = await commentsBase
    .where(
      sp.author
        ? and(inArray(comment.projectId, projectIds), eq(comment.authorId, sp.author))
        : inArray(comment.projectId, projectIds)
    )
    .orderBy(desc(comment.createdAt))
    .limit(100);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <span className="text-sm text-[color:var(--color-ink-muted)]">{rows.length} retour{rows.length > 1 ? "s" : ""}</span>
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        <Link
          href={`/${orgSlug}/inbox`}
          className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
            !sp.project ? "bg-[color:var(--color-ink)] text-white" : "bg-[color:var(--color-surface-2)] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
          }`}
        >
          Tous
        </Link>
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/${orgSlug}/inbox?project=${p.slug}`}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              sp.project === p.slug ? "bg-[color:var(--color-ink)] text-white" : "bg-[color:var(--color-surface-2)] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Aucun retour pour l'instant"
          description="Lance une session dans l'extension et commente un élément pour voir les retours apparaître ici."
          action={{ label: "Voir les projets", href: `/${orgSlug}/projects` }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => (
            <article
              key={r.id}
              className="bg-white border border-[color:var(--color-line)] rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-[4/3] bg-[color:var(--color-surface-2)] relative overflow-hidden">
                {r.screenshotPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/v1/uploads/${r.screenshotPath}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[color:var(--color-ink-muted)]">
                    (pas de capture)
                  </div>
                )}
                <span
                  className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ background: r.projectColor || "#ff6b35" }}
                >
                  {r.projectName}
                </span>
              </div>
              <div className="p-4">
                <p className="text-sm leading-relaxed line-clamp-3">{r.comment}</p>
                <div className="mt-3 text-xs text-[color:var(--color-ink-muted)] flex items-center gap-2 truncate">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate hover:text-[color:var(--color-ink)]"
                    title={r.url}
                  >
                    {shortUrl(r.url)}
                  </a>
                </div>
                <div className="mt-3 pt-3 border-t border-[color:var(--color-line)] flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={r.authorName} email={r.authorEmail} image={r.authorImage} size={20} />
                    <span className="text-xs text-[color:var(--color-ink-muted)] truncate">{r.authorName}</span>
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
