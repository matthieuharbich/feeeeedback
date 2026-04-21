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

### Widget

- Toujours ouvert pendant une session, se déplace à la souris (glisse l'en-tête)
- La position est mémorisée pour les sessions suivantes

Raccourcis :

- `Alt+Shift+S` : active / désactive le sélecteur (personnalisable dans `chrome://extensions/shortcuts`)
- `Esc` : ferme le panneau de commentaire, ou désactive le sélecteur
- `⌘ / Ctrl + Entrée` : enregistre le commentaire en cours

## Format d'export (JSON)

```json
{
  "tool": "feeeeedback",
  "version": 1,
  "session": {
    "startedAt": "2026-04-21T10:00:00.000Z",
    "startUrl": "https://exemple.com/page",
    "startTitle": "Titre de la page"
  },
  "items": [
    {
      "index": 1,
      "comment": "Le bouton est trop petit sur mobile.",
      "selector": "main > form > button.primary",
      "text": "Valider",
      "tagName": "button",
      "url": "https://exemple.com/page",
      "pageTitle": "Titre de la page",
      "createdAt": "2026-04-21T10:01:12.000Z"
    }
  ]
}
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
