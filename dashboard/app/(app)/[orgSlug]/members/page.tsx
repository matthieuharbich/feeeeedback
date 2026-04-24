"use client";

import { useEffect, useState, use } from "react";
import { Loader2, UserPlus, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { formatDate, initials } from "@/lib/utils";

type Member = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string; image?: string | null };
};
type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date | string;
};

export default function MembersPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const org = await authClient.organization.getFullOrganization();
    if (org.data) {
      setMembers((org.data.members as unknown as Member[]) || []);
      setInvitations(
        ((org.data.invitations as unknown as Invitation[]) || []).filter(
          (i) => i.status === "pending"
        )
      );
    }
  }

  useEffect(() => {
    refresh();
  }, [orgSlug]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await authClient.organization.inviteMember({
        email,
        role: role as "member" | "admin" | "owner",
      });
      if (err) throw new Error(err.message || "Erreur");
      setEmail("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function cancelInvite(id: string) {
    await authClient.organization.cancelInvitation({ invitationId: id });
    await refresh();
  }

  async function removeMember(id: string) {
    if (!confirm("Retirer ce membre ?")) return;
    await authClient.organization.removeMember({ memberIdOrEmail: id });
    await refresh();
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-4xl mx-auto">
      <PageHeader
        title="Membres"
        description={`${members.length} membre${members.length > 1 ? "s" : ""}${
          invitations.length > 0
            ? ` · ${invitations.length} invitation${invitations.length > 1 ? "s" : ""} en attente`
            : ""
        }`}
      />

      <Card className="p-5 mt-8">
        <h2 className="font-medium text-sm mb-3 flex items-center gap-2">
          <UserPlus className="size-4" />
          Inviter un membre
        </h2>
        <form onSubmit={invite} className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemple.com"
            className="flex-1"
          />
          <Select value={role} onValueChange={(v) => setRole(v || "member")}>
            <SelectTrigger className="sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Membre</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={loading || !email}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Inviter
          </Button>
        </form>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </Card>

      {invitations.length > 0 && (
        <div className="mt-8">
          <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Invitations en attente
          </h2>
          <Card className="p-0 overflow-hidden">
            {invitations.map((inv, i) => (
              <div
                key={inv.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  i !== invitations.length - 1 ? "border-b" : ""
                }`}
              >
                <div>
                  <div className="text-sm font-medium">{inv.email}</div>
                  <div className="text-xs text-muted-foreground">
                    expire le {formatDate(inv.expiresAt)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cancelInvite(inv.id)}
                  className="text-muted-foreground"
                >
                  <X className="size-3" />
                  Annuler
                </Button>
              </div>
            ))}
          </Card>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
          Membres ({members.length})
        </h2>
        <Card className="p-0 overflow-hidden">
          {members.map((m, i) => (
            <div
              key={m.id}
              className={`flex items-center justify-between px-4 py-3 ${
                i !== members.length - 1 ? "border-b" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarImage src={m.user.image || undefined} alt={m.user.name} />
                  <AvatarFallback>{initials(m.user.name, m.user.email)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium">{m.user.name}</div>
                  <div className="text-xs text-muted-foreground">{m.user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="capitalize">
                  {m.role}
                </Badge>
                {m.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMember(m.id)}
                    className="text-muted-foreground"
                  >
                    Retirer
                  </Button>
                )}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
