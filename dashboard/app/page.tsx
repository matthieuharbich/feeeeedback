import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSession, getUserOrgs } from "@/lib/server/session";

export default async function Home() {
  const session = await getSession();
  if (session?.user) {
    const orgs = await getUserOrgs(session.user.id);
    if (!orgs.length) redirect("/onboarding");
    redirect(`/${orgs[0].slug}/inbox`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 md:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[color:var(--brand)]" />
          <span className="font-semibold tracking-tight">feeeeedback</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/install">
              <Puzzle className="size-4" />
              Extension
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">Se connecter</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center px-6 md:px-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--brand)]" />
            Extension Chrome · multi-projet · team
          </div>
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            Le feedback visuel, <br />
            <span className="text-[color:var(--brand)]">simple</span>.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Pointe un élément d'une page live, ajoute un commentaire, partage
            avec ton équipe. Tout revient dans un dashboard unique, par projet,
            par personne, avec capture d'écran.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
            <Button asChild size="lg">
              <Link href="/login">
                Commencer <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/install">Installer l'extension</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="px-6 md:px-10 py-6 text-xs text-muted-foreground flex justify-between">
        <span>feeeeedback</span>
        <div className="flex gap-4">
          <a
            href="https://github.com/matthieuharbich/feeeeedback"
            className="hover:text-foreground"
          >
            GitHub
          </a>
          <Link href="/privacy" className="hover:text-foreground">
            Confidentialité
          </Link>
        </div>
      </footer>
    </div>
  );
}
