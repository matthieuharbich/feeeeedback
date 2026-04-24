"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || ""
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-[calc(100vh-0px)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            Crée ton organisation
          </h1>
          <p className="text-sm text-muted-foreground">
            Une organisation regroupe tes projets et tes membres.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-card border rounded-xl p-6 space-y-5 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              placeholder="Acme Inc."
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <div className="flex items-stretch rounded-md border overflow-hidden focus-within:ring-2 focus-within:ring-ring">
              <span className="px-3 flex items-center bg-muted text-muted-foreground text-xs font-mono border-r">
                feeeeedback.mtth.world/
              </span>
              <Input
                id="slug"
                required
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="acme"
                className="border-0 rounded-none font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading || !name || !slug}
            className="w-full"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Créer l'organisation
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </div>
    </div>
  );
}
