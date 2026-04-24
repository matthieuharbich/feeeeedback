"use client";

import { useState } from "react";
import { Logo } from "@/components/logo";
import { Avatar } from "@/components/avatar";
import { Check } from "lucide-react";

export function LinkExtensionClient({
  user,
}: {
  user: { id: string; name: string; email: string; image?: string | null };
}) {
  const [status, setStatus] = useState<"idle" | "linking" | "linked" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function link() {
    setStatus("linking");
    setError(null);
    try {
      const res = await fetch("/api/v1/me/api-keys", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      // Relay to extension via window.postMessage (content script will pick up)
      window.postMessage(
        {
          source: "feeeeedback",
          type: "FF_AUTH",
          apiKey: data.key,
          user: data.user,
          orgs: data.orgs,
        },
        "*"
      );
      setStatus("linked");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5">
        <Logo href="/app" />
      </header>
      <main className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-md">
          {status !== "linked" ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight mb-2">Connecter l'extension</h1>
              <p className="text-sm text-[color:var(--color-ink-muted)] mb-8">
                Tu vas connecter l'extension Chrome à ce compte. Les commentaires que tu captureras seront rattachés à toi.
              </p>

              <div className="bg-white border border-[color:var(--color-line)] rounded-2xl p-5 mb-4">
                <div className="flex items-center gap-3">
                  <Avatar name={user.name} email={user.email} image={user.image} size={40} />
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-[color:var(--color-ink-muted)]">{user.email}</div>
                  </div>
                </div>
              </div>

              <button
                onClick={link}
                disabled={status === "linking"}
                className="w-full px-3.5 py-3 rounded-xl bg-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-hover)] text-white text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {status === "linking" ? "Connexion…" : "Connecter cette extension"}
              </button>
              {error && <p className="text-sm text-red-600 mt-3 text-center">{error}</p>}
              <p className="text-xs text-[color:var(--color-ink-muted)] mt-6 text-center">
                L'extension doit être installée sur ce navigateur.
              </p>
            </>
          ) : (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-[color:var(--color-accent)]/10 flex items-center justify-center mb-6">
                <Check size={24} className="text-[color:var(--color-accent)]" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight mb-2">Extension connectée</h1>
              <p className="text-sm text-[color:var(--color-ink-muted)] mb-6">
                Tu peux fermer cet onglet et retourner sur la page où tu veux commenter.
              </p>
              <button
                onClick={() => window.close()}
                className="px-4 py-2 rounded-xl text-sm text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-surface-2)]"
              >
                Fermer l'onglet
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
