# Chrome Web Store — fiche de soumission

Tout le contenu à copier-coller dans la console développeur. Version `0.2.0`.

---

## Nom de l'extension
```
feeeeedback
```

## Short description (132 caractères max)
```
Pointe un élément d'une page, commente, partage. Tout revient dans ton dashboard — screenshot inclus. Équipes & sites live.
```

(128 caractères.)

## Catégorie
**Productivité**

## Langue principale
Français (ajoute l'anglais si tu veux un listing EN séparé).

---

## Description longue (pour le Store)

```
feeeeedback est l'outil de feedback visuel le plus simple pour les équipes qui livrent sur le web.

— Pointe —
Lance une session sur n'importe quelle page. Active le sélecteur (Alt+Shift+S), survole un bouton, un paragraphe, une image. Clique. Décris le problème en une phrase.

— Capture —
Chaque commentaire embarque automatiquement un screenshot recadré sur l'élément visé, avec un contour pour le localiser. Le dashboard garde aussi l'URL, le sélecteur CSS, le texte interne, la date, et l'auteur.

— Centralise —
Toutes les remarques de ton équipe arrivent dans une inbox visuelle, triée par projet. Tu sais qui a dit quoi, où, quand — sans ouvrir un seul Slack.

— Organise —
Crée une organisation, invite tes collègues et tes clients par email, définis des projets avec des patterns d'URL. L'extension pré-sélectionne le bon projet dès qu'elle reconnaît l'URL.

— Reste simple —
Pas de compte ? Utilise le mode local : tes remarques sont stockées dans le navigateur et tu peux les copier en JSON pour les coller dans Claude Code, ChatGPT ou Linear.

Caractéristiques
• Widget flottant, déplaçable, réductible
• Raccourci clavier personnalisable (Alt+Shift+S par défaut)
• Screenshots automatiques — tu ne prends rien, on s'en charge
• Détection de projet par URL pattern (glob : *, **)
• Export JSON local compatible avec Claude Code
• Sync cloud vers ton dashboard privé à feeeeedback.mtth.world
• 100 % open-source — github.com/matthieuharbich/feeeeedback

Respect de ta vie privée : l'extension ne lit aucune donnée de page sans ton action explicite. Voir la politique complète : https://feeeeedback.mtth.world/privacy
```

---

## Justification de chaque permission (le Store le demande)

### `activeTab`
> Accéder à l'onglet actif uniquement quand l'utilisateur lance explicitement une session de commentaire et capturer un screenshot recadré sur l'élément qu'il a sélectionné.

### `storage`
> Sauvegarder localement la position du widget flottant, les préférences, la session en cours et la clé d'API si l'utilisateur choisit de se connecter au dashboard.

### `scripting`
> Injecter dynamiquement les contrôles de sélection (outline au survol, panneau de commentaire) sur la page active quand l'utilisateur active le sélecteur.

### `tabs`
> Lire l'URL de l'onglet actif pour pré-sélectionner le projet correspondant dans le dropdown du popup. Pas de lecture du contenu de l'onglet.

### `clipboardWrite`
> Permettre à l'utilisateur de copier l'export JSON de ses commentaires dans son presse-papier quand il utilise le mode local (sans compte).

### `host_permissions: <all_urls>`
> L'extension doit pouvoir commenter n'importe quel site que l'utilisateur visite. Aucune requête réseau ni lecture de DOM n'est faite tant que l'utilisateur n'a pas activé manuellement une session sur la page.

---

## Single purpose description

> feeeeedback a un seul but : permettre à un utilisateur de commenter visuellement des éléments précis sur des pages web et de centraliser ces commentaires dans un espace collaboratif.

## Remote code
> **Non.** L'extension ne télécharge ni n'exécute de code JavaScript distant. Tout le code est empaqueté dans le ZIP. L'extension dialogue uniquement avec l'API REST de feeeeedback.mtth.world pour poster/lire des données.

## Data collection (Chrome Web Store data collection disclosure)
À cocher :
- [x] **Personally identifiable information** (nom, email — uniquement si l'utilisateur crée un compte)
- [x] **Authentication information** (clé d'API générée côté dashboard, stockée en local)
- [x] **User activity** (commentaires créés par l'utilisateur — c'est la feature)
- [x] **Website content** (screenshot cropé sur l'élément sélectionné — feature)
- [ ] Health info
- [ ] Financial info
- [ ] Personal communications
- [ ] Location
- [ ] Web history (❌ on ne track pas l'historique)

Et cocher :
- [x] I do not sell or transfer user data to third parties outside of the approved use cases
- [x] I do not use or transfer user data for purposes unrelated to my extension's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending

---

## URLs à fournir

| Champ | Valeur |
|---|---|
| Homepage URL | `https://github.com/matthieuharbich/feeeeedback` |
| Support URL | `https://github.com/matthieuharbich/feeeeedback/issues` |
| Privacy policy URL | `https://feeeeedback.mtth.world/privacy` (à mettre en ligne) |

---

## Images à fournir (à créer une fois)

| Asset | Dimensions | Obligatoire ? |
|---|---|---|
| Icône store | 128×128 px | ✅ (déjà dans `icons/icon128.png`) |
| Screenshots | 1280×800 ou 640×400 px | ✅ au moins 1, idéalement 3-5 |
| Promo tile (small) | 440×280 px | optionnel mais recommandé |
| Marquee promo tile | 1400×560 px | optionnel |

### Captures à prendre (suggestions)

1. **Widget actif sur un site** : overlay orange, panneau de commentaire ouvert sur un bouton.
2. **Dashboard inbox** : grille de 6 commentaires avec screenshots + auteurs.
3. **Popup connecté** : dropdown projet + bouton "Démarrer une session".
4. **Onboarding** : page de création d'organisation.
5. **Détail projet** : liste des retours avec screenshots.

---

## Package à uploader

Dans le repo :
```bash
./scripts/package-extension.sh
```

Produit `feeeeedback-extension-0.2.0.zip` à la racine — c'est ce fichier qu'on upload.

---

## Étapes côté dashboard développeur

1. Va sur `https://chrome.google.com/webstore/devconsole`
2. Paye les **5 $** (carte) — valable à vie pour ton compte Google
3. Remplis le profil développeur (nom affiché public, email de contact, URL site)
4. **Nouvelle élément** → **Extension**
5. Upload le ZIP
6. Remplis la fiche (copie-colle depuis ce document)
7. Catégorie : Productivité
8. Zones géographiques : Tous les pays
9. Public cible : Pas destiné aux enfants
10. **Soumettre**

## Timeline attendue

- Soumission : instantanée
- Examen Google : **1 à 3 jours** la plupart du temps
- Possibles allers-retours si Google demande des justifications supplémentaires (rare si permissions motivées)
- 1ère soumission parfois plus lente (5-14 jours)

Si rejet : Google liste les motifs dans la console. Corrige, re-soumets. Pas de pénalité.
