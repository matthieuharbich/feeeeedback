import { requireSession, getUserOrgs } from "@/lib/server/session";
import { TopNav } from "@/components/top-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const orgs = await getUserOrgs(session.user.id);
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav user={session.user} orgs={orgs} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
