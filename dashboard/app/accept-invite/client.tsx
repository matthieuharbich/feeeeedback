"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Logo } from "@/components/logo";
import { Check, Loader2, X } from "lucide-react";

export function AcceptInviteClient({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const ran = useRef(false);
  const [status, setStatus] = useState<"running" | "done" | "error">("running");
  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      try {
        const { data, error } = await authClient.organization.acceptInvitation({ invitationId });
        if (error) throw new Error(error.message || "Erreur");
        let resolvedSlug: string | null = null;
        const orgId = data?.invitation?.organizationId;
        if (orgId) {
          const list = await authClient.organization.list();
          const org = list.data?.find((o: { id: string }) => o.id === orgId);
          if (org?.slug) {
            resolvedSlug = org.slug;
            setOrgSlug(org.slug);
          }
        }
        setStatus("done");
        setTimeout(() => {
          router.push(resolvedSlug ? `/${resolvedSlug}/inbox` : "/");
        }, 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
        setStatus("error");
      }
    })();
  }, [invitationId, router]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5">
        <Logo href="/" />
      </header>
      <main className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-sm text-center">
          {status === "running" && (
            <>
              <Loader2 size={28} className="mx-auto animate-spin text-[color:var(--color-accent)]" />
              <h1 className="mt-6 text-xl font-semibold tracking-tight">Acceptation de l'invitation…</h1>
            </>
          )}
          {status === "done" && (
            <>
              <div className="w-14 h-14 mx-auto rounded-full bg-[color:var(--color-accent)]/10 flex items-center justify-center">
                <Check size={24} className="text-[color:var(--color-accent)]" />
              </div>
              <h1 className="mt-6 text-xl font-semibold tracking-tight">Invitation acceptée</h1>
              <p className="mt-2 text-sm text-[color:var(--color-ink-muted)]">Redirection…</p>
              {orgSlug && (
                <Link
                  href={`/${orgSlug}/inbox`}
                  className="inline-block mt-4 text-sm text-[color:var(--color-accent)] hover:underline"
                >
                  Aller au dashboard →
                </Link>
              )}
            </>
          )}
          {status === "error" && (
            <>
              <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                <X size={24} className="text-red-600" />
              </div>
              <h1 className="mt-6 text-xl font-semibold tracking-tight text-red-600">Invitation invalide</h1>
              <p className="mt-2 text-sm text-[color:var(--color-ink-muted)]">{error}</p>
              <Link
                href="/"
                className="inline-block mt-6 text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] underline"
              >
                Retour
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
