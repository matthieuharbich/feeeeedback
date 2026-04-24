"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import { Avatar } from "./avatar";
import { Logo } from "./logo";
import { ChevronDown, LogOut, Plus, Settings, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Org = { id: string; name: string; slug: string | null; logo: string | null };
type User = { id: string; name: string; email: string; image?: string | null };

export function TopNav({
  user,
  orgs,
  currentOrgSlug,
}: {
  user: User;
  orgs: Org[];
  currentOrgSlug?: string;
}) {
  const currentOrg = orgs.find((o) => o.slug === currentOrgSlug) || orgs[0];

  return (
    <header className="border-b border-[color:var(--color-line)] bg-white">
      <div className="flex items-center justify-between h-14 px-4 md:px-6">
        <div className="flex items-center gap-4">
          <Logo href={currentOrg?.slug ? `/${currentOrg.slug}/inbox` : "/"} />
          {currentOrg && <OrgSwitcher orgs={orgs} current={currentOrg} />}
        </div>
        <div className="flex items-center gap-2">
          {currentOrg && <NavLinks orgSlug={currentOrg.slug!} />}
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}

function NavLinks({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();
  const links = [
    { href: `/${orgSlug}/inbox`, label: "Inbox" },
    { href: `/${orgSlug}/projects`, label: "Projets" },
    { href: `/${orgSlug}/members`, label: "Membres" },
  ];
  return (
    <nav className="hidden md:flex items-center gap-1 mr-2">
      {links.map((l) => {
        const active = pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm transition-colors",
              active
                ? "bg-[color:var(--color-surface-2)] text-[color:var(--color-ink)]"
                : "text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface-2)]"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

function OrgSwitcher({ orgs, current }: { orgs: Org[]; current: Org }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg hover:bg-[color:var(--color-surface-2)] text-sm"
      >
        <span className="text-[color:var(--color-ink-muted)]">/</span>
        <span className="font-medium">{current.name}</span>
        <ChevronDown size={14} className="text-[color:var(--color-ink-muted)]" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-[color:var(--color-line)] rounded-xl shadow-lg py-1 z-50">
          <div className="px-3 py-2 text-xs text-[color:var(--color-ink-muted)] uppercase tracking-wider">
            Organisations
          </div>
          {orgs.map((o) => (
            <Link
              key={o.id}
              href={`/${o.slug}/inbox`}
              className="flex items-center justify-between px-3 py-2 hover:bg-[color:var(--color-surface-2)] text-sm"
              onClick={() => setOpen(false)}
            >
              <span className="font-medium truncate">{o.name}</span>
              {o.id === current.id && <Check size={14} className="text-[color:var(--color-accent)]" />}
            </Link>
          ))}
          <div className="border-t border-[color:var(--color-line)] mt-1 pt-1">
            <Link
              href="/onboarding"
              className="flex items-center gap-2 px-3 py-2 hover:bg-[color:var(--color-surface-2)] text-sm text-[color:var(--color-ink-muted)]"
              onClick={() => setOpen(false)}
            >
              <Plus size={14} />
              Nouvelle organisation
            </Link>
            <Link
              href={`/${current.slug}/settings`}
              className="flex items-center gap-2 px-3 py-2 hover:bg-[color:var(--color-surface-2)] text-sm text-[color:var(--color-ink-muted)]"
              onClick={() => setOpen(false)}
            >
              <Settings size={14} />
              Réglages
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    await authClient.signOut();
    router.push("/");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 pl-1 pr-1 py-1 rounded-full hover:bg-[color:var(--color-surface-2)]"
      >
        <Avatar name={user.name} email={user.email} image={user.image} size={28} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-[color:var(--color-line)] rounded-xl shadow-lg py-1 z-50">
          <div className="px-3 py-2 border-b border-[color:var(--color-line)]">
            <div className="text-sm font-medium truncate">{user.name}</div>
            <div className="text-xs text-[color:var(--color-ink-muted)] truncate">{user.email}</div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-[color:var(--color-surface-2)] text-sm text-[color:var(--color-ink-muted)]"
          >
            <LogOut size={14} />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
