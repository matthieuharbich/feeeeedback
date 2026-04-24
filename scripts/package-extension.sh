#!/usr/bin/env bash
# Package the extension/ folder into a ZIP ready for:
#  - Chrome Web Store upload
#  - Direct download from the dashboard (/install page)

set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

VERSION=$(python3 -c "import json; print(json.load(open('extension/manifest.json'))['version'])")
VERSIONED="$ROOT/feeeeedback-extension-$VERSION.zip"
LATEST="$ROOT/dashboard/public/feeeeedback-extension.zip"

echo "→ Packaging feeeeedback v$VERSION"
rm -f "$VERSIONED" "$LATEST"
mkdir -p "$(dirname "$LATEST")"

cd extension
zip -r "$VERSIONED" \
  manifest.json \
  icons/ \
  src/ \
  LICENSE \
  -x "*.DS_Store" \
  -x "STORE.md" > /dev/null

cp "$VERSIONED" "$LATEST"

cd "$ROOT"
SIZE=$(du -h "$VERSIONED" | cut -f1)
echo "✓ $VERSIONED ($SIZE)"
echo "✓ $LATEST (stable URL for the /install page)"
echo ""
echo "Next steps:"
echo "  - Store upload: upload $VERSIONED to chrome.google.com/webstore/devconsole"
echo "  - Users: share https://feeeeedback.mtth.world/install"
