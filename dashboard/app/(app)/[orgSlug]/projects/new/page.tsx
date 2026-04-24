"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export default function NewProjectPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [color, setColor] = useState("#ff6b35");
  const [patterns, setPatterns] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const urlPatterns = patterns
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgSlug,
          name,
          slug: slug || slugify(name),
          color,
          urlPatterns,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      router.push(`/${orgSlug}/projects`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <Link
        href={`/${orgSlug}/projects`}
        className="text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] mb-4 inline-block"
      >
        ← Projets
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Nouveau projet</h1>
      <p className="text-sm text-[color:var(--color-ink-muted)] mb-8">
        Rattache un projet à une ou plusieurs URL. L'extension pré-sélectionnera ce projet quand tu visites une page qui matche.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nom">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="Mon site"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[color:var(--color-line)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-3 focus:ring-[color:var(--color-accent)]/15 text-sm"
            autoFocus
          />
        </Field>
        <Field label="Slug">
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[color:var(--color-line)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-3 focus:ring-[color:var(--color-accent)]/15 text-sm font-mono"
          />
        </Field>
        <Field
          label="URL patterns"
          hint="Une par ligne. * = tout sauf /, ** = tout. Ex: *.mtth.world/** ou example.com/*"
        >
          <textarea
            value={patterns}
            onChange={(e) => setPatterns(e.target.value)}
            placeholder="*.exemple.com/**"
            rows={4}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[color:var(--color-line)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-3 focus:ring-[color:var(--color-accent)]/15 text-sm font-mono"
          />
        </Field>
        <Field label="Couleur">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-[color:var(--color-line)] cursor-pointer"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-[color:var(--color-line)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-3 focus:ring-[color:var(--color-accent)]/15 text-sm font-mono"
            />
          </div>
        </Field>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={loading || !name}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-hover)] text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? "Création…" : "Créer le projet"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-[color:var(--color-ink-muted)] mt-1">{hint}</p>}
    </div>
  );
}
