"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus, X, Save } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { cn, initials } from "@/lib/utils";

type Project = { id: string; slug: string; name: string; color: string };
type ApiMember = {
  memberId: string;
  role: string;
  userId: string;
  name: string;
  email: string;
  projectSlugs: string[];
};

const SYNTH_DOMAIN = "@local.feeeeedback";

export function MembersClient({
  orgSlug,
  projects,
  currentUserId,
}: {
  orgSlug: string;
  projects: Project[];
  currentUserId: string;
}) {
  const [members, setMembers] = useState<ApiMember[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [newProjectSlugs, setNewProjectSlugs] = useState<Set<string>>(
    new Set()
  );
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function refresh() {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/v1/admin/users?orgSlug=${orgSlug}`);
      const data = await res.json();
      setMembers(data.members || []);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug]);

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
          orgSlug,
          projectSlugs: Array.from(newProjectSlugs),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setName("");
      setPassword("");
      setNewProjectSlugs(new Set());
      await refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setCreating(false);
    }
  }

  async function updateAccess(userId: string, projectSlugs: string[]) {
    const res = await fetch(`/api/v1/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgSlug, projectSlugs }),
    });
    if (!res.ok) {
      alert(`Erreur: ${(await res.json().catch(() => ({}))).error || res.status}`);
    }
    await refresh();
  }

  async function removeUser(userId: string, name: string) {
    if (!confirm(`Retirer ${name} de l'organisation ?`)) return;
    const res = await fetch(
      `/api/v1/admin/users/${userId}?orgSlug=${orgSlug}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      alert(`Erreur: ${(await res.json().catch(() => ({}))).error || res.status}`);
    }
    await refresh();
  }

  function toggleNewProj(slug: string) {
    setNewProjectSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-4xl mx-auto">
      <PageHeader
        title="Membres"
        description={`${members.length} membre${members.length > 1 ? "s" : ""} dans cette organisation`}
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
          {projects.length > 0 && (
            <div>
              <Label className="mb-1.5 block">Projets accessibles</Label>
              <div className="flex flex-wrap gap-1.5">
                {projects.map((p) => {
                  const active = newProjectSlugs.has(p.slug);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleNewProj(p.slug)}
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
                Si aucun projet n'est sélectionné, le membre n'aura accès à aucun retour
                — tu peux ajuster plus tard.
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
        Membres ({members.length})
      </h2>
      {loadingList ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Chargement…
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden divide-y">
          {members.map((m) => (
            <MemberRow
              key={m.userId}
              m={m}
              projects={projects}
              isCurrent={m.userId === currentUserId}
              onSave={(slugs) => updateAccess(m.userId, slugs)}
              onRemove={() => removeUser(m.userId, m.name)}
            />
          ))}
        </Card>
      )}
    </div>
  );
}

function MemberRow({
  m,
  projects,
  isCurrent,
  onSave,
  onRemove,
}: {
  m: ApiMember;
  projects: Project[];
  isCurrent: boolean;
  onSave: (slugs: string[]) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Set<string>>(new Set(m.projectSlugs));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

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

  async function save() {
    setSaving(true);
    try {
      await onSave(Array.from(draft));
    } finally {
      setSaving(false);
    }
  }

  const isOwner = m.role === "owner";
  const displayEmail = m.email.endsWith(SYNTH_DOMAIN) ? "" : m.email;

  return (
    <div className="px-4 py-4 flex items-start gap-3">
      <Avatar className="size-9 mt-0.5">
        <AvatarFallback>{initials(m.name, m.email)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{m.name}</span>
          <Badge variant="outline" className="capitalize h-5">
            {m.role}
          </Badge>
          {isCurrent && (
            <Badge variant="outline" className="h-5 text-muted-foreground">
              toi
            </Badge>
          )}
          {displayEmail && (
            <span className="text-xs text-muted-foreground">{displayEmail}</span>
          )}
        </div>

        {isOwner ? (
          <div className="text-xs text-muted-foreground mt-2">
            Voit tous les projets (admin)
          </div>
        ) : projects.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {projects.map((p) => {
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
        ) : null}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {dirty && (
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Enregistrer
          </Button>
        )}
        {!isOwner && !isCurrent && (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onRemove}
            title="Retirer"
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
