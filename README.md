# feeeeedback

Extension Chrome pour capturer des retours visuels sur une page web, puis exporter le tout en markdown prêt à coller dans Claude Code.

## Fonctionnalités

- Démarrer une session de feedback sur la page active
- Survoler / cliquer un élément pour l'épingler
- Ajouter un commentaire dans une petite fenêtre flottante
- Session persistée entre les onglets / rechargements
- Export markdown (sélecteur CSS + texte + commentaire) vers le presse-papier

## Installation (mode développeur)

1. `git clone https://github.com/matthieuharbich/feeeeedback.git`
2. Ouvrir `chrome://extensions`
3. Activer **Mode développeur** (coin supérieur droit)
4. Cliquer **Charger l'extension non empaquetée** et sélectionner le dossier `feeeeedback/`
5. Épingler l'icône dans la barre d'outils

Pour mettre à jour : `git pull` puis cliquer l'icône de rechargement sur la carte de l'extension dans `chrome://extensions`.

## Utilisation

1. Cliquer l'icône **feeeeedback** dans la barre d'outils
2. **Démarrer une session** — un bandeau apparaît en haut à droite de la page
3. Survoler les éléments : ils s'entourent d'un contour orange
4. Cliquer un élément → saisir un commentaire → **Enregistrer**
5. Répéter autant que nécessaire
6. Dans le popup : **Copier pour Claude** → coller dans Claude Code

Raccourcis :

- `Esc` ferme le panneau de commentaire, puis arrête la session
- `⌘ / Ctrl + Entrée` enregistre le commentaire

## Format d'export

```markdown
# feeeeedback session

- URL : https://exemple.com/page
- Page : Titre de la page
- Démarrée : 2026-04-21T10:00:00.000Z
- Éléments : 2

## Retours

### 1. <button>
- Sélecteur : `main > form > button.primary`
- Texte : "Valider"
- URL : https://exemple.com/page

**Commentaire :**

Le bouton est trop petit et mal aligné sur mobile.
```

## Structure

```
feeeeedback/
├── manifest.json         # Manifest V3
├── src/
│   ├── background.js     # service worker, session state
│   ├── content.js        # picker + comment panel
│   ├── content.css       # in-page UI styles
│   ├── popup.html        # popup markup
│   ├── popup.css         # popup styles
│   └── popup.js          # popup logic + markdown export
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Permissions

- `activeTab`, `scripting` — injecter l'UI de sélection
- `storage` — persister la session
- `clipboardWrite` — copier l'export
- `<all_urls>` — fonctionner sur n'importe quelle page

## Licence

MIT
