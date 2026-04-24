import { readFileSync, statSync } from "fs";
import path from "path";
import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { Logo } from "@/components/logo";

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
  description: "Télécharge et installe l'extension Chrome feeeeedback en mode développeur.",
};

export default function InstallPage() {
  const version = getVersion();
  const size = getZipSize();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <Logo href="/" />
        <Link
          href="/login"
          className="text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
        >
          Se connecter
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
            Installer l'extension
          </h1>
          <p className="text-[color:var(--color-ink-muted)] mb-8 leading-relaxed">
            Chrome uniquement pour l'instant — en mode développeur le temps que la version Web Store soit validée.
          </p>

          <a
            href="/feeeeedback-extension.zip"
            download
            className="inline-flex items-center gap-2.5 bg-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-hover)] text-white px-5 py-3 rounded-xl font-medium text-sm transition-colors"
          >
            <Download size={16} />
            Télécharger feeeeedback v{version}
            {size && <span className="opacity-70 text-xs font-normal">({size})</span>}
          </a>

          <ol className="mt-12 space-y-6">
            <Step n={1} title="Dézippe l'archive">
              Le fichier téléchargé s'appelle <code className="font-mono text-xs bg-[color:var(--color-surface-2)] px-1.5 py-0.5 rounded">feeeeedback-extension.zip</code>.
              Dézippe-le — tu obtiens un dossier <code className="font-mono text-xs bg-[color:var(--color-surface-2)] px-1.5 py-0.5 rounded">feeeeedback-extension</code> (ou similaire).
            </Step>

            <Step n={2} title="Ouvre la page des extensions Chrome">
              Colle dans la barre d'adresse :{" "}
              <code className="font-mono text-xs bg-[color:var(--color-surface-2)] px-1.5 py-0.5 rounded">chrome://extensions</code>
            </Step>

            <Step n={3} title="Active le mode développeur">
              Bascule l'interrupteur <strong>Mode développeur</strong> en haut à droite.
            </Step>

            <Step n={4} title="Charge l'extension">
              Clique <strong>Charger l'extension non empaquetée</strong>, puis sélectionne le dossier dézippé.
            </Step>

            <Step n={5} title="Épingle l'icône (optionnel)">
              Clique l'icône puzzle 🧩 dans la barre d'outils Chrome → épingle feeeeedback pour y accéder en un clic.
            </Step>

            <Step n={6} title="Connecte-toi">
              Clic sur l'icône feeeeedback → entre ton email → reçois un lien par email → clic le lien. L'extension se connecte automatiquement à ton compte.
            </Step>
          </ol>

          <div className="mt-12 p-5 rounded-2xl bg-[color:var(--color-surface-2)] text-sm">
            <h3 className="font-semibold mb-2">Comment l'utiliser</h3>
            <ol className="space-y-1.5 text-[color:var(--color-ink-muted)] list-decimal pl-5">
              <li>Ouvre le site que tu veux commenter</li>
              <li>Clic sur l'icône feeeeedback → choisis un projet (ou &laquo; Local &raquo;) → <strong>Démarrer</strong></li>
              <li>Un widget flottant apparaît — clique <strong>Activer le sélecteur</strong> ou raccourci <kbd className="font-mono text-xs bg-white border border-[color:var(--color-line)] rounded px-1.5">Alt+Shift+S</kbd></li>
              <li>Survole et clique un élément → écris ton commentaire → <strong>Enregistrer</strong></li>
              <li>Les retours remontent automatiquement dans le dashboard avec screenshot</li>
            </ol>
          </div>

          <div className="mt-10 flex flex-wrap gap-4 text-sm">
            <a
              href="https://github.com/matthieuharbich/feeeeedback"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
            >
              Code source <ExternalLink size={12} />
            </a>
            <Link
              href="/privacy"
              className="text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
            >
              Politique de confidentialité
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[color:var(--color-ink)] text-white flex items-center justify-center font-semibold text-sm">
        {n}
      </div>
      <div className="pt-1">
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-[color:var(--color-ink-muted)] leading-relaxed">{children}</p>
      </div>
    </li>
  );
}
