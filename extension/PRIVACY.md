# Politique de confidentialité — feeeeedback

_Dernière mise à jour : 2026-04-24_

## Résumé

feeeeedback est une extension de collaboration qui permet à un utilisateur d'annoter visuellement des pages web et de synchroniser ces annotations vers un espace privé (organisation / projet) hébergé sur `feeeeedback.mtth.world`. L'extension ne collecte, ne vend et ne partage aucune donnée en dehors de ce flux.

## Données traitées par l'extension

### Stockées localement (chrome.storage.local, sur ta machine)

- Préférences (position du widget flottant, raccourci clavier, paramètres d'affichage).
- Session en cours si tu utilises le mode "Local" (pas de compte) : URL, titre de page, commentaires, sélecteurs CSS — **elle ne quitte jamais ton navigateur**.
- Si tu connectes l'extension à un compte : ta clé d'API, ton email, ton nom, l'URL du serveur associé (ex. `feeeeedback.mtth.world`).

### Envoyées au serveur feeeeedback (uniquement en mode connecté)

Quand tu cliques sur "Enregistrer" dans un commentaire pendant une session rattachée à un projet :

- Le commentaire texte que tu as saisi.
- Le sélecteur CSS de l'élément visé, son tag HTML, son texte interne (tronqué à 200 caractères).
- L'URL et le titre de la page courante.
- La taille du viewport et les coordonnées de l'élément.
- Une capture d'écran **limitée à l'élément visé** (recadrée automatiquement avec une marge de 24 px) capturée par `chrome.tabs.captureVisibleTab`.
- L'horodatage et ton identifiant utilisateur.

### Ce qui n'est **jamais** transmis

- L'historique de navigation.
- Les contenus de pages que tu n'as pas explicitement annotées.
- Tes identifiants, cookies, ou données d'autres sites.
- Tes frappes clavier en dehors du champ commentaire.

## Permissions demandées

| Permission | Raison |
|---|---|
| `activeTab` | Injecter l'UI de sélection et capturer l'onglet actif seulement quand tu lances une session. |
| `scripting` | Activer/désactiver le sélecteur sur la page en cours. |
| `storage` | Persister tes préférences et ta session locale. |
| `tabs` | Lire l'URL de l'onglet actif pour pré-sélectionner le projet correspondant. |
| `clipboardWrite` | Copier l'export JSON dans ton presse-papier en mode local. |
| `<all_urls>` | Permettre de commenter n'importe quelle page que tu visites. Le script ne fait rien tant qu'une session n'est pas activée par toi. |

## Serveur

Le serveur feeeeedback (Next.js + PostgreSQL) stocke les commentaires et les captures d'écran associés à ton compte. Les captures sont stockées sur disque, servies uniquement aux membres authentifiés de ton organisation.

Code source ouvert : [https://github.com/matthieuharbich/feeeeedback](https://github.com/matthieuharbich/feeeeedback)

## Partage avec des tiers

Aucun. Tes données ne sont partagées qu'avec les autres membres de ton organisation (ceux que **tu** invites).

## Suppression

- **Un commentaire** : supprime-le depuis l'extension ou le dashboard.
- **Ton compte / tes données** : contacte `matthieu.harbich@gmail.com` — suppression sous 7 jours.
- **Désinstallation de l'extension** : efface automatiquement toutes les données stockées localement.

## Contact

Matthieu Harbich · `matthieu.harbich@gmail.com`
