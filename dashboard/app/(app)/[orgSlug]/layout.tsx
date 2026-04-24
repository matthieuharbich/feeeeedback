import { requireSession, requireOrgMembership } from "@/lib/server/session";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await requireSession();
  await requireOrgMembership(session.user.id, orgSlug);
  return <>{children}</>;
}
