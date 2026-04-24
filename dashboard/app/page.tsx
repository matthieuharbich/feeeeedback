import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, getUserOrgs } from "@/lib/server/session";

export default async function Home() {
  const session = await getSession();
  if (session?.user) {
    const orgs = await getUserOrgs(session.user.id);
    if (!orgs.length) redirect("/onboarding");
    redirect(`/${orgs[0].slug}/inbox`);
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-8 py-6">
        <Logo />
        <Link
          href="/login"
          className="text-sm font-medium text-[color:var(--color-ink)] hover:text-[color:var(--color-accent)] transition-colors"
        >
          Se connecter
        </Link>
      </header>

      <section className="flex-1 flex items-center px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            Le feedback visuel, <br />
            <span className="text-[color:var(--color-accent)]">simple</span>.
          </h1>
          <p className="mt-6 text-lg text-[color:var(--color-ink-muted)] leading-relaxed">
            Pointe un élément d'une page live, ajoute un commentaire, partage avec ton équipe.
            <br />
            Tout revient dans un dashboard unique, par projet, par personne, avec capture d'écran.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="bg-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-hover)] text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors"
            >
              Commencer
            </Link>
            <Link
              href="/install"
              className="px-6 py-3 rounded-xl font-medium text-sm text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface-2)] transition-colors"
            >
              Installer l'extension →
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-8 py-6 text-xs text-[color:var(--color-ink-muted)] flex justify-between">
        <span>feeeeedback</span>
        <span>
          <a href="https://github.com/matthieuharbich/feeeeedback" className="hover:text-[color:var(--color-ink)]">
            GitHub
          </a>
        </span>
      </footer>
    </main>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--color-accent)]" />
      <span className="font-semibold tracking-tight">feeeeedback</span>
    </div>
  );
}
