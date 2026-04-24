"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

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
        <div className="w-12 h-12 mx-auto rounded-full bg-[color:var(--color-accent)]/10 flex items-center justify-center mb-6">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[color:var(--color-accent)]">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold tracking-tight mb-2">Vérifie ta boîte mail</h1>
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          Lien envoyé à <strong>{email}</strong>. Il expire dans 5 min.
        </p>
        <button
          onClick={() => {
            setSent(false);
            setEmail("");
          }}
          className="mt-6 text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] underline"
        >
          Utiliser un autre email
        </button>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-center mb-1">Se connecter</h1>
      <p className="text-sm text-[color:var(--color-ink-muted)] text-center mb-8">
        {mode === "password" ? "Email + mot de passe." : "On t'envoie un lien magique pour te connecter."}
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="toi@exemple.com"
          className="w-full px-3.5 py-2.5 rounded-xl border border-[color:var(--color-line)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-3 focus:ring-[color:var(--color-accent)]/15 text-sm"
          autoFocus
        />
        {mode === "password" && (
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[color:var(--color-line)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-3 focus:ring-[color:var(--color-accent)]/15 text-sm"
          />
        )}
        <button
          type="submit"
          disabled={loading || !email || (mode === "password" && !password)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-hover)] text-white text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? "…" : mode === "password" ? "Se connecter" : "M'envoyer le lien"}
        </button>
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => {
            setMode(mode === "password" ? "magic" : "password");
            setError(null);
            setPassword("");
          }}
          className="text-xs text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] underline"
        >
          {mode === "password" ? "Utiliser un lien magique à la place" : "J'ai un mot de passe"}
        </button>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link href="/" className="flex items-center gap-2 mb-10">
        <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--color-accent)]" />
        <span className="font-semibold tracking-tight">feeeeedback</span>
      </Link>
      <div className="w-full max-w-sm">
        <Suspense fallback={<div className="text-center text-sm text-[color:var(--color-ink-muted)]">Chargement…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
