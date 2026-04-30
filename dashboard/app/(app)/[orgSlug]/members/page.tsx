import { requireSession, getOrgBySlug } from "@/lib/server/session";
import { userIsOrgOwner } from "@/lib/server/access";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { MembersClient } from "./members-client";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await requireSession();
  const org = await getOrgBySlug(orgSlug);
  if (!org) return null;

  const isAdmin = await userIsOrgOwner(session.user.id, org.id);
  if (!isAdmin) {
    return (
      <div className="px-6 md:px-10 py-8 max-w-4xl mx-auto">
        <PageHeader
          title="Membres"
          description="Réservé aux administrateurs de l'organisation."
        />
        <Card className="p-10 text-center mt-8 text-sm text-muted-foreground">
          Seul un admin peut gérer les membres et leurs accès.
        </Card>
      </div>
    );
  }

  return <MembersClient orgSlug={orgSlug} currentUserId={session.user.id} />;
}
