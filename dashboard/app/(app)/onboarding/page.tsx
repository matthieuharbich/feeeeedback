"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Logo } from "@/components/logo";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await authClient.organization.create({
        name,
        slug: slug || slugify(name),
      });
      if (err) throw new Error(err.message || "Erreur");
      if (!data?.slug) throw new Error("Pas de slug");
      await authClient.organization.setActive({ organizationSlug: data.slug });
      router.push(`/${data.slug}/projects/new`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-20">
      <div className="mb-12">
        <Logo href="/" />
      </div>

      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Crée ton organisation</h1>
        <p className="text-sm text-[color:var(--color-ink-muted)] mb-8">
          Une organisation regroupe tes projets et tes membres.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nom</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Acme Inc."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[color:var(--color-line)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-3 focus:ring-[color:var(--color-accent)]/15 text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Slug</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[color:var(--color-ink-muted)]">feeeeedback.mtth.world/</span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="acme"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-[color:var(--color-line)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-3 focus:ring-[color:var(--color-accent)]/15 text-sm font-mono"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !name || !slug}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-hover)] text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? "Création…" : "Créer l'organisation"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </div>
    </div>
  );
}
