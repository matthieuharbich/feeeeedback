#!/usr/bin/env bash
# Package the extension/ folder into a ZIP ready for Chrome Web Store upload.

set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

VERSION=$(python3 -c "import json; print(json.load(open('extension/manifest.json'))['version'])")
OUT="$ROOT/feeeeedback-extension-$VERSION.zip"

echo "→ Packaging feeeeedback v$VERSION"
rm -f "$OUT"

# Include only what the Store needs; exclude dev docs.
cd extension
zip -r "$OUT" \
  manifest.json \
  icons/ \
  src/ \
  LICENSE \
  -x "*.DS_Store" \
  -x "STORE.md" > /dev/null

cd "$ROOT"
SIZE=$(du -h "$OUT" | cut -f1)
echo "✓ $OUT ($SIZE)"
echo ""
echo "Next steps:"
echo "  1. chrome.google.com/webstore/devconsole"
echo "  2. Upload this ZIP"
echo "  3. Copy-paste the listing content from extension/STORE.md"
