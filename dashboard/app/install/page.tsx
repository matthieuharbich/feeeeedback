import { readFileSync, statSync } from "fs";
import path from "path";
import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function getVersion() {
  try {
    const p = path.join(process.cwd(), "public", "extension-version.txt");
    return readFileSync(p, "utf8").trim() || "latest";
  } catch {
    return "latest";
  }
}

function getZipSize() {
  try {
    const p = path.join(process.cwd(), "public", "feeeeedback-extension.zip");
    const s = statSync(p);
    return `${Math.round(s.size / 1024)} KB`;
  } catch {
    return null;
  }
}

export const metadata = {
  title: "Installer l'extension — feeeeedback",
  description:
    "Télécharge et installe l'extension Chrome feeeeedback en mode développeur.",
};

export default function InstallPage() {
  const version = getVersion();
  const size = getZipSize();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="px-6 py-5 flex items-center justify-between border-b bg-background">
        <Logo />
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Se connecter</Link>
        </Button>
      </header>

      <main className="px-6 py-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
            Installer l'extension
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Chrome uniquement pour l'instant — en mode développeur le temps que
            la version Web Store soit validée.
          </p>

          <Button asChild size="lg">
            <a href="/feeeeedback-extension.zip" download>
              <Download className="size-4" />
              Télécharger feeeeedback v{version}
              {size && (
                <span className="opacity-70 text-xs font-normal ml-1">
                  ({size})
                </span>
              )}
            </a>
          </Button>

          <Card className="mt-12 p-6">
            <ol className="space-y-5">
              <Step n={1} title="Dézippe l'archive">
                Le fichier s'appelle{" "}
                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  feeeeedback-extension.zip
                </code>
                . Dézippe-le pour obtenir un dossier.
              </Step>
              <Step n={2} title="Ouvre la page des extensions">
                Colle dans la barre d'adresse :{" "}
                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  chrome://extensions
                </code>
              </Step>
              <Step n={3} title="Active le mode développeur">
                Bascule l'interrupteur <strong>Mode développeur</strong> en haut
                à droite.
              </Step>
              <Step n={4} title="Charge l'extension">
                Clique <strong>Charger l'extension non empaquetée</strong>, puis
                sélectionne le dossier dézippé.
              </Step>
              <Step n={5} title="Épingle l'icône (optionnel)">
                Clique l'icône puzzle 🧩 dans la barre d'outils Chrome → épingle
                feeeeedback pour y accéder en un clic.
              </Step>
              <Step n={6} title="Déverrouille">
                Clic sur l'icône feeeeedback → entre le mot de passe → choisis
                ton prénom et le projet → <strong>Démarrer</strong>.
              </Step>
            </ol>
          </Card>

          <Card className="mt-6 p-5">
            <h3 className="font-semibold mb-3">Comment l'utiliser</h3>
            <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal pl-5">
              <li>Ouvre le site que tu veux commenter</li>
              <li>
                Clic sur l'icône feeeeedback → choisis un projet (ou « Local »)
                → <strong>Démarrer</strong>
              </li>
              <li>
                Widget flottant → clique <strong>Activer le sélecteur</strong>{" "}
                ou raccourci{" "}
                <kbd className="font-mono text-xs bg-muted border rounded px-1.5">
                  Alt+Shift+S
                </kbd>
              </li>
              <li>
                Survole et clique un élément → écris ton commentaire →{" "}
                <strong>Enregistrer</strong>
              </li>
              <li>Les retours remontent automatiquement dans le dashboard</li>
            </ol>
          </Card>

          <div className="mt-10 flex flex-wrap gap-4 text-sm">
            <a
              href="https://github.com/matthieuharbich/feeeeedback"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              Code source <ExternalLink className="size-3" />
            </a>
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground"
            >
              Politique de confidentialité
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <div className="flex-shrink-0 size-7 rounded-full bg-foreground text-background flex items-center justify-center font-semibold text-xs">
        {n}
      </div>
      <div className="pt-0.5">
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
      </div>
    </li>
  );
}
