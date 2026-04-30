"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginIdToEmail } from "@/lib/auth-username";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const email = loginIdToEmail(identifier);
      const { error: err } = await authClient.signIn.email({
        email,
        password,
        callbackURL: redirect,
      });
      if (err) throw new Error(err.message || "Identifiants incorrects");
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-center mb-1">
        Se connecter
      </h1>
      <p className="text-sm text-muted-foreground text-center mb-8">
        Pseudo et mot de passe.
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="identifier" className="sr-only">
            Pseudo
          </Label>
          <Input
            id="identifier"
            type="text"
            required
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Pseudo (ex. Tony)"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="sr-only">
            Mot de passe
          </Label>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !identifier || !password}
          className="w-full"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          Se connecter
        </Button>
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-muted/30">
      <Link href="/" className="flex items-center gap-2 mb-10">
        <span className="w-2 h-2 rounded-full bg-[color:var(--brand)]" />
        <span className="font-semibold tracking-tight">feeeeedback</span>
      </Link>
      <div className="w-full max-w-sm bg-card border rounded-xl p-8 shadow-sm">
        <Suspense
          fallback={
            <div className="text-center text-sm text-muted-foreground">
              Chargement…
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
