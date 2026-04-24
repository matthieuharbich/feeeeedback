import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité — feeeeedback",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="flex items-center gap-2 mb-10 group">
          <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--color-accent)]" />
          <span className="font-semibold tracking-tight">feeeeedback</span>
        </Link>

        <article className="prose prose-sm max-w-none">
          <h1 className="text-3xl font-semibold tracking-tight mb-2">Politique de confidentialité</h1>
          <p className="text-sm text-[color:var(--color-ink-muted)] mb-10">Dernière mise à jour : 24 avril 2026</p>

          <h2 className="text-lg font-semibold mt-8 mb-2">Résumé</h2>
          <p className="text-sm leading-relaxed">
            feeeeedback est un outil de collaboration qui permet d'annoter visuellement des pages web et de synchroniser
            ces annotations vers un espace privé (organisation / projet). L'extension ne collecte, ne vend et ne partage
            aucune donnée en dehors de ce flux.
          </p>

          <h2 className="text-lg font-semibold mt-8 mb-2">Données traitées par l'extension</h2>
          <h3 className="text-base font-semibold mt-4 mb-1">Stockées localement</h3>
          <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1">
            <li>Préférences (position du widget flottant, raccourci clavier).</li>
            <li>
              Session en cours en <strong>mode local</strong> (pas de compte) : URL, titre de page, commentaires,
              sélecteurs CSS — <strong>elle ne quitte jamais ton navigateur</strong>.
            </li>
            <li>
              Si tu connectes l'extension à un compte : ta clé d'API, ton email, ton nom, l'URL du serveur associé.
            </li>
          </ul>

          <h3 className="text-base font-semibold mt-4 mb-1">Envoyées au serveur (uniquement en mode connecté)</h3>
          <p className="text-sm leading-relaxed">
            Quand tu cliques sur <em>Enregistrer</em> dans un commentaire pendant une session rattachée à un projet :
          </p>
          <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1">
            <li>Le commentaire texte que tu as saisi.</li>
            <li>Le sélecteur CSS de l'élément visé, son tag HTML, son texte interne (tronqué à 200 caractères).</li>
            <li>L'URL et le titre de la page courante.</li>
            <li>La taille du viewport et les coordonnées de l'élément.</li>
            <li>Une capture d'écran <strong>limitée à l'élément visé</strong> (recadrée avec une marge de 24 px).</li>
            <li>L'horodatage et ton identifiant utilisateur.</li>
          </ul>

          <h3 className="text-base font-semibold mt-4 mb-1">Ce qui n'est jamais transmis</h3>
          <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1">
            <li>L'historique de navigation.</li>
            <li>Les contenus de pages que tu n'as pas explicitement annotées.</li>
            <li>Tes identifiants, cookies, ou données d'autres sites.</li>
            <li>Tes frappes clavier en dehors du champ commentaire.</li>
          </ul>

          <h2 className="text-lg font-semibold mt-8 mb-2">Permissions</h2>
          <div className="overflow-x-auto">
            <table className="text-sm w-full">
              <thead>
                <tr className="border-b border-[color:var(--color-line)]">
                  <th className="text-left py-2 pr-4 font-medium">Permission</th>
                  <th className="text-left py-2 font-medium">Raison</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-line)]">
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">activeTab</td>
                  <td className="py-2">Injecter l'UI et capturer l'onglet actif uniquement lors d'une session.</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">scripting</td>
                  <td className="py-2">Activer/désactiver le sélecteur sur la page en cours.</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">storage</td>
                  <td className="py-2">Persister préférences et session locale.</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">tabs</td>
                  <td className="py-2">Lire l'URL de l'onglet actif pour pré-sélectionner le projet.</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">clipboardWrite</td>
                  <td className="py-2">Copier l'export JSON dans le presse-papier (mode local).</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">&lt;all_urls&gt;</td>
                  <td className="py-2">Permettre de commenter n'importe quelle page que tu visites.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-lg font-semibold mt-8 mb-2">Serveur</h2>
          <p className="text-sm leading-relaxed">
            Le serveur feeeeedback stocke les commentaires et captures associés à ton compte. Les captures ne sont
            servies qu'aux membres authentifiés de ton organisation. Code source ouvert :{" "}
            <a
              href="https://github.com/matthieuharbich/feeeeedback"
              className="text-[color:var(--color-accent)] hover:underline"
            >
              github.com/matthieuharbich/feeeeedback
            </a>
            .
          </p>

          <h2 className="text-lg font-semibold mt-8 mb-2">Partage avec des tiers</h2>
          <p className="text-sm leading-relaxed">
            Aucun. Tes données ne sont partagées qu'avec les autres membres de ton organisation (ceux que tu invites).
          </p>

          <h2 className="text-lg font-semibold mt-8 mb-2">Suppression</h2>
          <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1">
            <li>
              <strong>Un commentaire</strong> : supprime-le depuis l'extension ou le dashboard.
            </li>
            <li>
              <strong>Ton compte / tes données</strong> : contacte{" "}
              <a
                href="mailto:matthieu.harbich@gmail.com"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                matthieu.harbich@gmail.com
              </a>{" "}
              — suppression sous 7 jours.
            </li>
            <li>
              <strong>Désinstallation</strong> : efface automatiquement toutes les données locales.
            </li>
          </ul>

          <h2 className="text-lg font-semibold mt-8 mb-2">Contact</h2>
          <p className="text-sm leading-relaxed">
            Matthieu Harbich ·{" "}
            <a
              href="mailto:matthieu.harbich@gmail.com"
              className="text-[color:var(--color-accent)] hover:underline"
            >
              matthieu.harbich@gmail.com
            </a>
          </p>
        </article>
      </div>
    </div>
  );
}
