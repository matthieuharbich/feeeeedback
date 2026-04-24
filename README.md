# feeeeedback

Plateforme de feedback visuel pour sites live. Les utilisateurs pointent un élément sur une page avec l'extension Chrome, commentent, et tout est centralisé sur un dashboard avec capture d'écran, auteur, horodatage et organisation multi-projets.

```
feeeeedback/
├── extension/          # Chrome extension (MV3, vanilla JS)
├── dashboard/          # Dashboard + API (Next.js 16, TypeScript)
├── docker-compose.yml          # dev: Postgres uniquement
├── docker-compose.prod.yml     # prod: Postgres + dashboard
└── Caddyfile.snippet           # reverse proxy pour VPS
```

## Démarrage rapide (local)

```bash
# 1. Postgres
docker compose up -d

# 2. Dashboard
cd dashboard
cp .env.example .env
# Édite .env : génère BETTER_AUTH_SECRET avec `openssl rand -hex 32`
npm install
npm run db:migrate
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Les magic links sont affichés dans la console serveur si `RESEND_API_KEY` est vide.

### Extension en mode dev

1. Ouvrir `chrome://extensions`
2. Activer **Mode développeur**
3. **Charger l'extension non empaquetée** → dossier `extension/`
4. Cliquer l'icône → **Se connecter** → le flow passe par `http://localhost:3000/extension/link`

Pour pointer sur un autre serveur (prod), édite l'URL dans `extension/src/popup.js` (`loginBtn` handler).

## Fonctionnalités

- **Auth magic-link** (Better Auth)
- **Organisations** avec invitations de membres par email
- **Projets** avec URL patterns (glob : `*`, `**`)
- **Extension Chrome** :
  - Widget flottant draggable, raccourci `Alt+Shift+S`
  - Détection auto du projet par URL
  - **Screenshot automatique** cropé sur l'élément avec outline orange
  - Export JSON local (fallback sans compte)
- **Dashboard** :
  - Inbox visuel (grille screenshots + auteur + date + page)
  - Filtrage par projet
  - Vue projet (stats + historique)
  - Gestion membres + invitations

## Déploiement VPS

```bash
# Sur le VPS
cd /home/ubuntu/mtth-stack/
rsync -avz --exclude node_modules --exclude .next --exclude .git ~/sites/feeeeedback/ ubuntu@VPS:/home/ubuntu/mtth-stack/feeeeedback/

ssh ubuntu@VPS
cd /home/ubuntu/mtth-stack/feeeeedback

# Créer un .env à la racine
cat > .env <<'EOF'
POSTGRES_USER=feeeeedback
POSTGRES_PASSWORD=$(openssl rand -hex 24)
POSTGRES_DB=feeeeedback
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
BETTER_AUTH_URL=https://feeeeedback.mtth.world
NEXT_PUBLIC_APP_URL=https://feeeeedback.mtth.world
RESEND_API_KEY=re_xxx   # obligatoire en prod pour les emails
MAIL_FROM=feeeeedback <noreply@feeeeedback.mtth.world>
EOF

docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec dashboard node -e "require('child_process').execSync('npm run db:migrate', {stdio: 'inherit'})"
# ou migrer en one-shot :
# docker compose -f docker-compose.prod.yml run --rm dashboard node node_modules/.bin/tsx scripts/migrate.ts
```

Puis ajoute `Caddyfile.snippet` au Caddyfile existant, et `caddy reload`.

### DNS
`feeeeedback.mtth.world` → VPS (déjà couvert par le wildcard `*.mtth.world`).

## Stack

| Couche | Choix |
|---|---|
| Backend | Next.js 16 (app router) — même app sert dashboard et `/api/*` |
| Auth | Better Auth (magic-link + organization) + API keys maison pour l'extension |
| ORM + DB | Drizzle + PostgreSQL 17 |
| Email | Resend (fallback console si pas de clé) |
| Extension | MV3, vanilla JS, `chrome.tabs.captureVisibleTab` pour les screenshots |
| Deploy | Docker Compose + Caddy 2 (reverse proxy) |

## Licence

MIT (voir `extension/LICENSE`).
