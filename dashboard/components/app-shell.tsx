"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Inbox,
  FolderKanban,
  Users,
  ChevronsUpDown,
  Plus,
  LogOut,
  Check,
  Puzzle,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Org = { id: string; name: string; slug: string | null; logo: string | null };
type User = { id: string; name: string; email: string; image?: string | null };

export function AppShell({
  user,
  orgs,
  children,
}: {
  user: User;
  orgs: Org[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Derive current org from the first path segment, falling back to first org.
  const firstSeg = pathname?.split("/")[1] || "";
  const currentOrg =
    orgs.find((o) => o.slug === firstSeg) || orgs[0];
  return (
    <div className="min-h-screen bg-muted/30 flex">
      <Sidebar user={user} orgs={orgs} currentOrg={currentOrg} />
      <main className="flex-1 min-w-0 md:pl-[240px]">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}

type Project = { id: string; name: string; slug: string; color: string; organizationId: string };

function Sidebar({
  user,
  orgs,
  currentOrg,
}: {
  user: User;
  orgs: Org[];
  currentOrg: Org | undefined;
}) {
  const pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!currentOrg?.id) return;
    fetch("/api/v1/projects", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list: Project[] = data.projects || [];
        setProjects(list.filter((p) => p.organizationId === currentOrg.id));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentOrg?.id, pathname]);

  const navItems = currentOrg?.slug
    ? [
        { href: `/${currentOrg.slug}/inbox`, label: "Inbox", icon: Inbox },
        { href: `/${currentOrg.slug}/projects`, label: "Tous les projets", icon: FolderKanban },
        { href: `/${currentOrg.slug}/members`, label: "Membres", icon: Users },
      ]
    : [];

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 w-[240px] flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="px-3 py-3">
        <OrgSwitcher orgs={orgs} currentOrg={currentOrg} />
      </div>

      <nav className="px-3 py-2 flex-1 overflow-y-auto">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-2 mb-1">
          Workspace
        </div>
        {navItems.map((item) => {
          const active =
            item.label === "Inbox"
              ? pathname === item.href || pathname.startsWith(`${item.href}?`)
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors mb-0.5",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon size={16} className="opacity-80" />
              {item.label}
            </Link>
          );
        })}

        {currentOrg?.slug && projects.length > 0 && (
          <>
            <div className="flex items-center justify-between px-2 mb-1 mt-6">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Projets
              </span>
              <Link
                href={`/${currentOrg.slug}/projects/new`}
                className="text-muted-foreground hover:text-sidebar-accent-foreground"
                title="Nouveau projet"
              >
                <Plus size={13} />
              </Link>
            </div>
            {projects.map((p) => {
              const href = `/${currentOrg.slug}/projects/${p.slug}`;
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={p.id}
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors mb-0.5",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: p.color }}
                  />
                  <span className="truncate">{p.name}</span>
                </Link>
              );
            })}
          </>
        )}

        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-2 mb-1 mt-6">
          Ressources
        </div>
        <Link
          href="/install"
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors"
        >
          <Puzzle size={16} className="opacity-80" />
          Extension
        </Link>
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <UserMenu user={user} currentOrgSlug={currentOrg?.slug ?? undefined} />
      </div>
    </aside>
  );
}

function OrgSwitcher({ orgs, currentOrg }: { orgs: Org[]; currentOrg?: Org }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent text-left outline-none">
        <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold flex-shrink-0">
          {initials(currentOrg?.name || "f")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{currentOrg?.name || "feeeeedback"}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {currentOrg?.slug ? `feeeeedback.mtth.world/${currentOrg.slug}` : "Choisir une organisation"}
          </div>
        </div>
        <ChevronsUpDown size={14} className="text-muted-foreground flex-shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider">
          Organisations
        </DropdownMenuLabel>
        {orgs.map((o) => (
          <DropdownMenuItem key={o.id} onClick={() => router.push(`/${o.slug}/inbox`)}>
            <div className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold mr-1.5">
              {initials(o.name)}
            </div>
            <span className="flex-1 truncate">{o.name}</span>
            {o.id === currentOrg?.id && <Check size={13} />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/onboarding")}>
          <Plus size={13} className="mr-1.5" />
          Nouvelle organisation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu({ user, currentOrgSlug }: { user: User; currentOrgSlug?: string }) {
  const router = useRouter();
  async function logout() {
    try {
      await authClient.signOut();
    } catch {}
    router.push("/login");
    router.refresh();
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent text-left outline-none">
        <Avatar className="h-7 w-7">
          <AvatarImage src={user.image || undefined} alt={user.name} />
          <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{user.name || user.email}</div>
          <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel>{user.name || user.email}</DropdownMenuLabel>
        {currentOrgSlug && (
          <DropdownMenuItem
            onClick={() => router.push(`/${currentOrgSlug}/members`)}
          >
            <Users size={13} className="mr-1.5" />
            Membres
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => router.push("/install")}>
          <Puzzle size={13} className="mr-1.5" />
          Télécharger l'extension
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut size={13} className="mr-1.5" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
