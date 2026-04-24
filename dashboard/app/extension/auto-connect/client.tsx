"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Check, Loader2 } from "lucide-react";

export function AutoConnectClient({
  user,
}: {
  user: { id: string; name: string; email: string; image?: string | null };
}) {
  const ran = useRef(false);
  const [status, setStatus] = useState<"running" | "done" | "error">("running");
  const [error, setError] = useState<string | null>(null);
  const [hasOrg, setHasOrg] = useState(true);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      try {
        const res = await fetch("/api/v1/me/api-keys", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur");
        setHasOrg((data.orgs || []).length > 0);
        window.postMessage(
          {
            source: "feeeeedback",
            type: "FF_AUTH",
            apiKey: data.key,
            user: data.user,
            orgs: data.orgs,
          },
          window.location.origin
        );
        setStatus("done");
        // try to auto-close after a short delay
        setTimeout(() => window.close(), 1200);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
        setStatus("error");
      }
    })();
  }, []);

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
              <h1 className="mt-6 text-xl font-semibold tracking-tight">Connexion de l'extension…</h1>
              <p className="mt-2 text-sm text-[color:var(--color-ink-muted)]">Ça prend 1 seconde.</p>
            </>
          )}
          {status === "done" && (
            <>
              <div className="w-14 h-14 mx-auto rounded-full bg-[color:var(--color-accent)]/10 flex items-center justify-center">
                <Check size={24} className="text-[color:var(--color-accent)]" />
              </div>
              <h1 className="mt-6 text-xl font-semibold tracking-tight">Extension connectée</h1>
              <p className="mt-2 text-sm text-[color:var(--color-ink-muted)]">
                Salut {user.name} — cet onglet se ferme tout seul.
              </p>
              {!hasOrg && (
                <p className="mt-4 text-sm">
                  <Link
                    href="/onboarding"
                    className="text-[color:var(--color-accent)] hover:underline"
                  >
                    Crée ta première organisation →
                  </Link>
                </p>
              )}
              <button
                onClick={() => window.close()}
                className="mt-6 text-xs text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] underline"
              >
                Fermer l'onglet
              </button>
            </>
          )}
          {status === "error" && (
            <>
              <h1 className="text-xl font-semibold tracking-tight text-red-600">Échec</h1>
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
