"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

function useOutsideClose(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);
  return ref;
}

function OrgSwitcher({ orgs, currentOrg }: { orgs: Org[]; currentOrg?: Org }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent text-left"
      >
        <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold flex-shrink-0">
          {initials(currentOrg?.name || "f")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">
            {currentOrg?.name || "feeeeedback"}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {currentOrg?.slug
              ? `feeeeedback.mtth.world/${currentOrg.slug}`
              : "Choisir une organisation"}
          </div>
        </div>
        <ChevronsUpDown size={14} className="text-muted-foreground flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-popover text-popover-foreground rounded-lg shadow-lg ring-1 ring-foreground/10 py-1 z-50">
          <div className="px-3 py-1 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            Organisations
          </div>
          {orgs.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => go(`/${o.slug}/inbox`)}
              className="w-full text-left flex items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-muted rounded-md mx-1"
            >
              <div className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">
                {initials(o.name)}
              </div>
              <span className="flex-1 truncate">{o.name}</span>
              {o.id === currentOrg?.id && <Check size={13} />}
            </button>
          ))}
          <div className="my-1 border-t" />
          <button
            type="button"
            onClick={() => go("/onboarding")}
            className="w-full text-left flex items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-muted rounded-md mx-1 text-muted-foreground"
          >
            <Plus size={13} />
            Nouvelle organisation
          </button>
        </div>
      )}
    </div>
  );
}

function UserMenu({ user, currentOrgSlug }: { user: User; currentOrgSlug?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));

  async function logout() {
    setOpen(false);
    try {
      await authClient.signOut();
    } catch {}
    router.push("/login");
    router.refresh();
  }

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent text-left"
      >
        <Avatar className="h-7 w-7">
          <AvatarImage src={user.image || undefined} alt={user.name} />
          <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {user.name || user.email}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
        </div>
      </button>
      {open && (
        <div className="absolute left-0 bottom-full mb-1 w-56 bg-popover text-popover-foreground rounded-lg shadow-lg ring-1 ring-foreground/10 py-1 z-50">
          <div className="px-3 py-1.5 text-xs font-medium border-b mb-1">
            {user.name || user.email}
          </div>
          {currentOrgSlug && (
            <button
              type="button"
              onClick={() => go(`/${currentOrgSlug}/members`)}
              className="w-full text-left flex items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-muted rounded-md mx-1"
            >
              <Users size={13} />
              Membres
            </button>
          )}
          <button
            type="button"
            onClick={() => go("/install")}
            className="w-full text-left flex items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-muted rounded-md mx-1"
          >
            <Puzzle size={13} />
            Télécharger l'extension
          </button>
          <div className="my-1 border-t" />
          <button
            type="button"
            onClick={logout}
            className="w-full text-left flex items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-muted rounded-md mx-1 text-destructive"
          >
            <LogOut size={13} />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
