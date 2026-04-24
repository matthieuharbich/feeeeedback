import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { project, comment } from "@/lib/db/schema";
import { requireSession, getOrgBySlug } from "@/lib/server/session";
import { EmptyState } from "@/components/empty-state";
import { Plus } from "lucide-react";
import { sql } from "drizzle-orm";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await requireSession();
  const org = await getOrgBySlug(orgSlug);
  if (!org) return null;

  const projects = await db
    .select({
      id: project.id,
      name: project.name,
      slug: project.slug,
      color: project.color,
      urlPatterns: project.urlPatterns,
      createdAt: project.createdAt,
      commentCount: sql<number>`(SELECT COUNT(*)::int FROM ${comment} WHERE ${comment.projectId} = ${project.id})`,
    })
    .from(project)
    .where(eq(project.organizationId, org.id))
    .orderBy(desc(project.createdAt));

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Projets</h1>
        <Link
          href={`/${orgSlug}/projects/new`}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-hover)] text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Nouveau projet
        </Link>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="Aucun projet"
          description="Crée un projet pour grouper tes retours et les rattacher à des URLs."
          action={{ label: "Créer un projet", href: `/${orgSlug}/projects/new` }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/${orgSlug}/projects/${p.slug}`}
              className="group bg-white border border-[color:var(--color-line)] rounded-2xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: p.color }}
                  />
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{p.name}</h3>
                    <p className="text-xs text-[color:var(--color-ink-muted)] font-mono truncate">
                      {(p.urlPatterns as string[])?.[0] || "(pas de pattern)"}
                      {(p.urlPatterns as string[])?.length > 1 && ` +${(p.urlPatterns as string[]).length - 1}`}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-[color:var(--color-ink-muted)] flex-shrink-0 ml-2">
                  {p.commentCount} retour{p.commentCount > 1 ? "s" : ""}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
