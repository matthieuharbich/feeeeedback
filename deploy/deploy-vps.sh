#!/usr/bin/env bash
# Déploiement feeeeedback sur le VPS mtth-stack.
# À exécuter DEPUIS TA MACHINE LOCALE (pas sur le VPS).
# Usage: bash deploy/deploy-vps.sh

set -euo pipefail

VPS_HOST="${VPS_HOST:-ubuntu@83.228.222.4}"
VPS_KEY="${VPS_KEY:-$HOME/.ssh/mtth-vps}"
VPS_DIR="/home/ubuntu/mtth-stack/apps/feeeeedback"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== 1/7 rsync vers $VPS_HOST:$VPS_DIR ==="
rsync -avz --delete \
  --exclude 'node_modules/' \
  --exclude '.next/' \
  --exclude '.git/' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'dashboard/uploads/' \
  --exclude '*.zip' \
  --exclude '.claude-flow/' \
  --exclude '.claude/' \
  -e "ssh -i $VPS_KEY" \
  "$LOCAL_DIR/" "$VPS_HOST:$VPS_DIR/"

echo ""
echo "=== 2/7 generate .env.prod on VPS (if missing) ==="
ssh -i "$VPS_KEY" "$VPS_HOST" bash <<'REMOTE'
set -euo pipefail
ENV_FILE=/home/ubuntu/mtth-stack/apps/feeeeedback/.env.prod
if [ ! -f "$ENV_FILE" ]; then
  # Pick up POSTGRES creds from the central mtth-stack .env
  POSTGRES_USER=$(grep '^POSTGRES_USER=' /home/ubuntu/mtth-stack/.env | cut -d= -f2-)
  POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' /home/ubuntu/mtth-stack/.env | cut -d= -f2-)
  BETTER_AUTH_SECRET=$(openssl rand -hex 32)

  cat > "$ENV_FILE" <<EOF
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
BETTER_AUTH_URL=https://feeeeedback.mtth.world
NEXT_PUBLIC_APP_URL=https://feeeeedback.mtth.world
RESEND_API_KEY=
MAIL_FROM=feeeeedback <noreply@feeeeedback.mtth.world>
EOF
  chmod 600 "$ENV_FILE"
  echo "  → .env.prod generated"
else
  echo "  → .env.prod already exists, keeping it"
fi
REMOTE

echo ""
echo "=== 3/7 create feeeeedback database if missing ==="
ssh -i "$VPS_KEY" "$VPS_HOST" bash <<'REMOTE'
set -euo pipefail
POSTGRES_USER=$(grep '^POSTGRES_USER=' /home/ubuntu/mtth-stack/.env | cut -d= -f2-)
if docker exec mtth-postgres psql -U "$POSTGRES_USER" -d postgres -lqt | cut -d\| -f1 | grep -qw feeeeedback; then
  echo "  → database 'feeeeedback' already exists"
else
  docker exec mtth-postgres psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE feeeeedback;"
  echo "  → database 'feeeeedback' created"
fi
REMOTE

echo ""
echo "=== 4/7 build + start dashboard container ==="
ssh -i "$VPS_KEY" "$VPS_HOST" bash <<'REMOTE'
set -euo pipefail
cd /home/ubuntu/mtth-stack/apps/feeeeedback
docker compose -f deploy/mtth-stack.compose.yml --env-file .env.prod up -d --build
REMOTE

echo ""
echo "=== 5/7 run migrations ==="
ssh -i "$VPS_KEY" "$VPS_HOST" bash <<'REMOTE'
set -euo pipefail
cd /home/ubuntu/mtth-stack/apps/feeeeedback
docker compose -f deploy/mtth-stack.compose.yml --env-file .env.prod run --rm dashboard node scripts/migrate.mjs
REMOTE

echo ""
echo "=== 6/7 add Caddy reverse proxy block (idempotent) ==="
ssh -i "$VPS_KEY" "$VPS_HOST" bash <<'REMOTE'
set -euo pipefail
CADDY=/home/ubuntu/mtth-stack/Caddyfile
BLOCK='feeeeedback.mtth.world {
\treverse_proxy mtth-feeeeedback:3000
}'

if grep -q "feeeeedback.mtth.world" "$CADDY"; then
  echo "  → Caddy block already present"
else
  cp "$CADDY" "${CADDY}.bak-$(date +%s)"
  printf '\n# feeeeedback — dashboard + API (multi-tenant)\n%s\n' "$BLOCK" >> "$CADDY"
  echo "  → Caddy block appended (backup kept)"
fi

# Reload Caddy
docker exec mtth-caddy caddy reload --config /etc/caddy/Caddyfile || {
  echo "  ! caddy reload failed, trying restart"
  docker restart mtth-caddy
}
REMOTE

echo ""
echo "=== 7/7 smoke test ==="
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' https://feeeeedback.mtth.world/privacy)
echo "  → https://feeeeedback.mtth.world/privacy  =>  HTTP $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
  echo ""
  echo "✓ Déploiement réussi."
  echo "  Dashboard:       https://feeeeedback.mtth.world"
  echo "  Privacy:         https://feeeeedback.mtth.world/privacy"
  echo "  Extension link:  https://feeeeedback.mtth.world/extension/link"
else
  echo ""
  echo "! Déploiement incomplet. Debug :"
  echo "  ssh $VPS_HOST 'docker logs mtth-feeeeedback --tail 40'"
fi
