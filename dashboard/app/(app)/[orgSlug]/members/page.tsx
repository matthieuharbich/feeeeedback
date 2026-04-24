"use client";

import { useEffect, useState, use } from "react";
import { authClient } from "@/lib/auth-client";
import { Avatar } from "@/components/avatar";
import { formatDate } from "@/lib/utils";

type Member = { id: string; role: string; user: { id: string; name: string; email: string; image?: string | null } };
type Invitation = { id: string; email: string; role: string; status: string; expiresAt: Date | string };

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
        ((org.data.invitations as unknown as Invitation[]) || []).filter((i) => i.status === "pending")
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
      const { error: err } = await authClient.organization.inviteMember({ email, role: role as "member" | "admin" | "owner" });
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
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Membres</h1>

      <div className="bg-white border border-[color:var(--color-line)] rounded-2xl p-5 mb-6">
        <h2 className="font-semibold mb-3">Inviter un membre</h2>
        <form onSubmit={invite} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemple.com"
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-[color:var(--color-line)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-3 focus:ring-[color:var(--color-accent)]/15 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-[color:var(--color-line)] text-sm bg-white"
          >
            <option value="member">Membre</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={loading || !email}
            className="px-4 py-2.5 rounded-xl bg-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-hover)] text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Envoi…" : "Inviter"}
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      {invitations.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-[color:var(--color-ink-muted)] uppercase tracking-wider mb-2">
            Invitations en attente
          </h2>
          <div className="bg-white border border-[color:var(--color-line)] rounded-2xl divide-y divide-[color:var(--color-line)]">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{inv.email}</div>
                  <div className="text-xs text-[color:var(--color-ink-muted)]">expire le {formatDate(inv.expiresAt)}</div>
                </div>
                <button
                  onClick={() => cancelInvite(inv.id)}
                  className="text-xs text-[color:var(--color-ink-muted)] hover:text-red-600"
                >
                  Annuler
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-medium text-[color:var(--color-ink-muted)] uppercase tracking-wider mb-2">
          Membres ({members.length})
        </h2>
        <div className="bg-white border border-[color:var(--color-line)] rounded-2xl divide-y divide-[color:var(--color-line)]">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={m.user.name} email={m.user.email} image={m.user.image} size={32} />
                <div>
                  <div className="text-sm font-medium">{m.user.name}</div>
                  <div className="text-xs text-[color:var(--color-ink-muted)]">{m.user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[color:var(--color-ink-muted)] capitalize">{m.role}</span>
                {m.role !== "owner" && (
                  <button
                    onClick={() => removeMember(m.id)}
                    className="text-xs text-[color:var(--color-ink-muted)] hover:text-red-600"
                  >
                    Retirer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
