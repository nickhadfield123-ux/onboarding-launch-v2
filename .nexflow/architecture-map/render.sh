#!/usr/bin/env bash
# Render the architecture map to SVG + PDF using mermaid-cli (mmdc).
#
# Reproducibility:
#   - Run from the repo root: ./.nexflow/architecture-map/render.sh
#   - Requires: python3, node, mmdc (install: npm i -g @mermaid-js/mermaid-cli)
#
# Outputs (all under .nexflow/architecture-map/):
#   - diagram.mmd  raw Mermaid source extracted from the inventory
#   - diagram.svg  vector render
#   - diagram.pdf  print-ready render
#   - inventory.json  machine-readable inventory dump

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="$REPO_ROOT/.nexflow/architecture-map"
SCRIPT="$OUT_DIR/introspect.py"

cd "$REPO_ROOT"

echo "[1/3] Regenerating ARCHITECTURE.md + Mermaid source"
python3 "$SCRIPT" \
  --repo-root "$REPO_ROOT" \
  --out "$REPO_ROOT/ARCHITECTURE.md" \
  --mermaid "$OUT_DIR/diagram.mmd" \
  --json "$OUT_DIR/inventory.json"

if ! command -v mmdc >/dev/null 2>&1; then
  echo "ERROR: mmdc not found. Install with: npm i -g @mermaid-js/mermaid-cli" >&2
  exit 1
fi

echo "[2/3] Rendering SVG"
mmdc -i "$OUT_DIR/diagram.mmd" -o "$OUT_DIR/diagram.svg" -b transparent

echo "[3/3] Rendering PDF"
mmdc -i "$OUT_DIR/diagram.mmd" -o "$OUT_DIR/diagram.pdf" -b transparent -f

echo "Done. Outputs:"
ls -la "$OUT_DIR"/diagram.* "$REPO_ROOT/ARCHITECTURE.md"
