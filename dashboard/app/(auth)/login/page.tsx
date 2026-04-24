"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "password") {
        const { error: err } = await authClient.signIn.email({
          email,
          password,
          callbackURL: redirect,
        });
        if (err) throw new Error(err.message || "Identifiants incorrects");
        router.push(redirect);
        router.refresh();
      } else {
        const { error: err } = await authClient.signIn.magicLink({
          email,
          callbackURL: redirect,
        });
        if (err) throw new Error(err.message || "Erreur");
        setSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-brand/10 flex items-center justify-center mb-6 text-brand">
          <Mail className="size-5" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight mb-2">
          Vérifie ta boîte mail
        </h1>
        <p className="text-sm text-muted-foreground">
          Lien envoyé à <strong>{email}</strong>. Il expire dans 5 min.
        </p>
        <Button
          variant="link"
          className="mt-6 text-muted-foreground"
          onClick={() => {
            setSent(false);
            setEmail("");
          }}
        >
          Utiliser un autre email
        </Button>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-center mb-1">
        Se connecter
      </h1>
      <p className="text-sm text-muted-foreground text-center mb-8">
        {mode === "password"
          ? "Email + mot de passe."
          : "On t'envoie un lien magique pour te connecter."}
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="sr-only">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="toi@exemple.com"
            autoFocus
          />
        </div>
        {mode === "password" && (
          <div className="space-y-1.5">
            <Label htmlFor="password" className="sr-only">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
            />
          </div>
        )}
        <Button
          type="submit"
          disabled={loading || !email || (mode === "password" && !password)}
          className="w-full"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {mode === "password" ? "Se connecter" : "M'envoyer le lien"}
        </Button>
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
      </form>

      <div className="mt-6 text-center">
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={() => {
            setMode(mode === "password" ? "magic" : "password");
            setError(null);
            setPassword("");
          }}
          className="text-muted-foreground"
        >
          {mode === "password"
            ? "Utiliser un lien magique à la place"
            : "J'ai un mot de passe"}
        </Button>
      </div>
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
