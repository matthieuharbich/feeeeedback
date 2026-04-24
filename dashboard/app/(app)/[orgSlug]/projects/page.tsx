import Link from "next/link";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { project, comment } from "@/lib/db/schema";
import { requireSession, getOrgBySlug } from "@/lib/server/session";
import { Plus, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

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
    <div className="px-6 md:px-10 py-8 max-w-[1500px] mx-auto">
      <PageHeader
        title="Projets"
        description={`${projects.length} projet${projects.length > 1 ? "s" : ""}`}
        actions={
          <Button asChild>
            <Link href={`/${orgSlug}/projects/new`}>
              <Plus className="size-4" />
              Nouveau projet
            </Link>
          </Button>
        }
      />

      {projects.length === 0 ? (
        <Card className="p-16 text-center mt-8">
          <div className="size-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <FolderKanban className="size-5" />
          </div>
          <h3 className="text-lg font-medium mb-2">Aucun projet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            Crée un projet pour grouper tes retours et les rattacher à des URLs.
          </p>
          <Button asChild>
            <Link href={`/${orgSlug}/projects/new`}>Créer un projet</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {projects.map((p) => {
            const patterns = (p.urlPatterns as string[]) || [];
            return (
              <Link
                key={p.id}
                href={`/${orgSlug}/projects/${p.slug}`}
                className="group"
              >
                <Card className="p-5 hover:shadow-md hover:border-foreground/10 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ background: p.color }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {p.commentCount} retour{p.commentCount > 1 ? "s" : ""}
                    </span>
                  </div>
                  <h3 className="font-semibold truncate">{p.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono truncate mt-1">
                    {patterns[0] || "(pas de pattern)"}
                    {patterns.length > 1 && ` +${patterns.length - 1}`}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
