"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, UserPlus, X, Save, Plus, Building2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { cn, initials } from "@/lib/utils";

type Org = { id: string; slug: string; name: string };
type Project = {
  id: string;
  slug: string;
  name: string;
  color: string;
  organizationId: string;
};
type Membership = {
  orgSlug: string;
  orgName: string;
  role: string;
  projectSlugs: string[];
};
type AdminUser = {
  userId: string;
  name: string;
  email: string;
  memberships: Membership[];
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

const SYNTH_DOMAIN = "@local.feeeeedback";

export function MembersClient({
  orgSlug,
  currentUserId,
}: {
  orgSlug: string;
  currentUserId: string;
}) {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Create-user form
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [createOrgSlug, setCreateOrgSlug] = useState(orgSlug);
  const [createRole, setCreateRole] = useState("member");
  const [createProjects, setCreateProjects] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/users/all");
      const data = await res.json();
      setOrgs(data.orgs || []);
      setProjects(data.projects || []);
      setUsers(data.users || []);
      if (!data.orgs?.find((o: Org) => o.slug === createOrgSlug) && data.orgs?.[0]) {
        setCreateOrgSlug(data.orgs[0].slug);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projectsByOrg = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const p of projects) {
      const orgIdSlug =
        orgs.find((o) => o.id === p.organizationId)?.slug || p.organizationId;
      const arr = map.get(orgIdSlug) || [];
      arr.push(p);
      map.set(orgIdSlug, arr);
    }
    return map;
  }, [projects, orgs]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          password,
          orgSlug: createOrgSlug,
          projectSlugs: Array.from(createProjects),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      // If a non-default role was requested, follow up with PATCH role
      if (createRole !== "member") {
        await fetch(`/api/v1/admin/users/${data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgSlug: createOrgSlug, role: createRole }),
        });
      }
      setName("");
      setPassword("");
      setCreateProjects(new Set());
      setCreateRole("member");
      await refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setCreating(false);
    }
  }

  const currentOrgProjects = projectsByOrg.get(createOrgSlug) || [];

  if (loading) {
    return (
      <div className="px-6 md:px-10 py-8 max-w-5xl mx-auto">
        <PageHeader title="Membres" />
        <Card className="p-10 text-center text-sm text-muted-foreground mt-8">
          Chargement…
        </Card>
      </div>
    );
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-5xl mx-auto">
      <PageHeader
        title="Membres"
        description={`${users.length} utilisateur${users.length > 1 ? "s" : ""} sur ${orgs.length} organisation${orgs.length > 1 ? "s" : ""}`}
      />

      <Card className="p-5 mt-8">
        <h2 className="font-medium text-sm mb-3 flex items-center gap-2">
          <UserPlus className="size-4" />
          Créer un membre
        </h2>
        <form onSubmit={createUser} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="m-name">Pseudo</Label>
              <Input
                id="m-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tony"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-pass">Mot de passe</Label>
              <Input
                id="m-pass"
                required
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ex. serena"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Organisation</Label>
              <Select value={createOrgSlug} onValueChange={(v) => v && setCreateOrgSlug(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.slug}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rôle</Label>
              <Select
                value={createRole}
                onValueChange={(v) => v && setCreateRole(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member (accès limité)</SelectItem>
                  <SelectItem value="admin">Admin (gère l&apos;org)</SelectItem>
                  <SelectItem value="owner">Owner (admin + propriétaire)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {createRole === "member" && currentOrgProjects.length > 0 && (
            <div>
              <Label className="mb-1.5 block">Projets accessibles</Label>
              <div className="flex flex-wrap gap-1.5">
                {currentOrgProjects.map((p) => {
                  const active = createProjects.has(p.slug);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setCreateProjects((prev) => {
                          const next = new Set(prev);
                          if (next.has(p.slug)) next.delete(p.slug);
                          else next.add(p.slug);
                          return next;
                        })
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 h-7 px-3 rounded-full border text-xs",
                        active
                          ? "bg-foreground text-background border-foreground"
                          : "bg-background hover:bg-muted"
                      )}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: p.color }}
                      />
                      {p.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Pour les rôles admin/owner, l&apos;accès projet est implicite — pas besoin de sélectionner.
              </p>
            </div>
          )}
          <div>
            <Button type="submit" disabled={creating || !name || !password}>
              {creating && <Loader2 className="size-4 animate-spin" />}
              Créer
            </Button>
            {createError && (
              <span className="text-sm text-destructive ml-3">{createError}</span>
            )}
          </div>
        </form>
      </Card>

      <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mt-10 mb-2">
        Utilisateurs ({users.length})
      </h2>
      <Card className="p-0 overflow-hidden divide-y">
        {users.map((u) => (
          <UserRow
            key={u.userId}
            u={u}
            orgs={orgs}
            projectsByOrg={projectsByOrg}
            isCurrent={u.userId === currentUserId}
            onChanged={refresh}
          />
        ))}
        {!users.length && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Aucun utilisateur
          </div>
        )}
      </Card>
    </div>
  );
}

function UserRow({
  u,
  orgs,
  projectsByOrg,
  isCurrent,
  onChanged,
}: {
  u: AdminUser;
  orgs: Org[];
  projectsByOrg: Map<string, Project[]>;
  isCurrent: boolean;
  onChanged: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const otherOrgs = orgs.filter(
    (o) => !u.memberships.find((m) => m.orgSlug === o.slug)
  );
  const [addingOrg, setAddingOrg] = useState<string | null>(null);

  const displayEmail = u.email.endsWith(SYNTH_DOMAIN) ? "" : u.email;

  async function setRole(orgSlug: string, role: string) {
    setBusy(`role-${orgSlug}`);
    await fetch(`/api/v1/admin/users/${u.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgSlug, role }),
    });
    await onChanged();
    setBusy(null);
  }

  async function setProjects(orgSlug: string, projectSlugs: string[]) {
    setBusy(`proj-${orgSlug}`);
    await fetch(`/api/v1/admin/users/${u.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgSlug, projectSlugs }),
    });
    await onChanged();
    setBusy(null);
  }

  async function removeFromOrg(orgSlug: string) {
    if (!confirm(`Retirer ${u.name} de l'organisation ?`)) return;
    setBusy(`del-${orgSlug}`);
    await fetch(
      `/api/v1/admin/users/${u.userId}?orgSlug=${encodeURIComponent(orgSlug)}`,
      { method: "DELETE" }
    );
    await onChanged();
    setBusy(null);
  }

  async function addToOrg(orgSlug: string) {
    setBusy(`add-${orgSlug}`);
    await fetch(`/api/v1/admin/users/${u.userId}/orgs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgSlug, role: "member" }),
    });
    setAddingOrg(null);
    await onChanged();
    setBusy(null);
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-start gap-3">
        <Avatar className="size-9 mt-0.5">
          <AvatarFallback>{initials(u.name, u.email)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{u.name}</span>
            {isCurrent && (
              <Badge variant="outline" className="h-5 text-muted-foreground">
                toi
              </Badge>
            )}
            {displayEmail && (
              <span className="text-xs text-muted-foreground">{displayEmail}</span>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {u.memberships.map((m) => (
              <OrgMembershipBlock
                key={m.orgSlug}
                m={m}
                projectsForOrg={projectsByOrg.get(m.orgSlug) || []}
                busy={busy}
                isCurrent={isCurrent}
                onRole={(role) => setRole(m.orgSlug, role)}
                onProjects={(slugs) => setProjects(m.orgSlug, slugs)}
                onRemove={() => removeFromOrg(m.orgSlug)}
              />
            ))}
          </div>

          {otherOrgs.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              {addingOrg ? (
                <>
                  <Select
                    value={addingOrg}
                    onValueChange={(v) => v && setAddingOrg(v)}
                  >
                    <SelectTrigger className="h-7 text-xs w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {otherOrgs.map((o) => (
                        <SelectItem key={o.id} value={o.slug}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => addToOrg(addingOrg)}
                    disabled={busy?.startsWith("add-")}
                  >
                    Ajouter
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAddingOrg(null)}
                  >
                    Annuler
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => setAddingOrg(otherOrgs[0]?.slug || null)}
                >
                  <Plus className="size-3.5" />
                  Ajouter à une autre org
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrgMembershipBlock({
  m,
  projectsForOrg,
  busy,
  isCurrent,
  onRole,
  onProjects,
  onRemove,
}: {
  m: Membership;
  projectsForOrg: Project[];
  busy: string | null;
  isCurrent: boolean;
  onRole: (role: string) => Promise<void> | void;
  onProjects: (slugs: string[]) => Promise<void> | void;
  onRemove: () => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<Set<string>>(new Set(m.projectSlugs));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(new Set(m.projectSlugs));
    setDirty(false);
  }, [m.projectSlugs]);

  function toggle(slug: string) {
    const next = new Set(draft);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setDraft(next);
    const original = new Set(m.projectSlugs);
    setDirty(
      next.size !== original.size ||
        Array.from(next).some((s) => !original.has(s))
    );
  }

  const isElevated = m.role === "owner" || m.role === "admin";
  const roleBusy = busy === `role-${m.orgSlug}`;
  const projBusy = busy === `proj-${m.orgSlug}`;
  const delBusy = busy === `del-${m.orgSlug}`;

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="size-3.5 text-muted-foreground" />
          <span className="text-sm font-medium truncate">{m.orgName}</span>
          <span className="text-xs text-muted-foreground font-mono">/{m.orgSlug}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Select
            value={m.role}
            onValueChange={(v) => v && onRole(v)}
            disabled={roleBusy || isCurrent}
          >
            <SelectTrigger className="h-7 text-xs w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">{ROLE_LABEL.member}</SelectItem>
              <SelectItem value="admin">{ROLE_LABEL.admin}</SelectItem>
              <SelectItem value="owner">{ROLE_LABEL.owner}</SelectItem>
            </SelectContent>
          </Select>
          {!isCurrent && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onRemove}
              disabled={delBusy}
              title={`Retirer de ${m.orgName}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {!isElevated && projectsForOrg.length > 0 && (
        <div className="mt-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Projets accessibles
            </span>
            {dirty && (
              <Button
                size="sm"
                onClick={() => onProjects(Array.from(draft))}
                disabled={projBusy}
                className="h-6 px-2"
              >
                {projBusy ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Save className="size-3" />
                )}
                Enregistrer
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {projectsForOrg.map((p) => {
              const active = draft.has(p.slug);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.slug)}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border text-[11px]",
                    active
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background hover:bg-muted text-muted-foreground"
                  )}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: p.color }}
                  />
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isElevated && (
        <div className="text-xs text-muted-foreground mt-2">
          Voit tous les projets ({m.role}).
        </div>
      )}
    </div>
  );
}
