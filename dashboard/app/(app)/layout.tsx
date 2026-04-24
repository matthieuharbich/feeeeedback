import { requireSession, getUserOrgs } from "@/lib/server/session";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const orgs = await getUserOrgs(session.user.id);
  return (
    <AppShell user={session.user} orgs={orgs}>
      {children}
    </AppShell>
  );
}
