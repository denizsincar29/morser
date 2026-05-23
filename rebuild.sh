#!/usr/bin/env bash
# rebuild.sh — deploy Morser static frontend to the web root
#
# What it does:
#   • Copies every static frontend file (HTML, CSS, JS, sounds, icons, manifest, SW)
#   • Skips .git, *.sh, *.md, node_modules
#   • Never touches the signaler — restart it yourself if needed
#
# Usage:
#   ./rebuild.sh                  — deploy to default target
#   ./rebuild.sh /other/path      — deploy to a custom path
#
# The signaler binary from web_midi_streamer works as-is:
#   ws://<your-host>:8765/signal?room=ROOM&peer=PEER
# Point Morser at it by adding one line before together.js loads:
#   <script>window.MORSER_SIGNAL_HOST = 'your-host.example.com:8765';</script>
# Or if Morser is served from the same host as the signaler, nothing to change.

set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="${1:-/var/www/html/denizsincar.ru/morser}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}==> Morser rebuild${NC}"
echo    "    src : $SRC"
echo    "    dest: $DEST"
echo

# ── Preflight ──────────────────────────────────────────────────────────────────
if [[ ! -f "$SRC/index.html" ]]; then
    echo -e "${RED}ERROR: run this script from the repo root (index.html not found)${NC}"
    exit 1
fi

if [[ ! -d "$DEST" ]]; then
    echo -e "${YELLOW}  creating $DEST${NC}"
    mkdir -p "$DEST"
fi

# ── Copy static files ──────────────────────────────────────────────────────────
# --checksum   only copy when content differs
# --delete     remove stale files in dest that no longer exist in src

rsync -av --checksum --delete \
    --exclude='.git/'         \
    --exclude='node_modules/' \
    --exclude='*.sh'          \
    --exclude='*.md'          \
    --exclude='*.bak'         \
    --exclude='*.py'          \
    "$SRC/" "$DEST/"

echo
echo -e "${GREEN}==> Done.${NC}"
echo -e "${YELLOW}    Signaler was NOT touched — restart manually if needed.${NC}"
echo    "    e.g.:  sudo systemctl restart signaler"
echo    "    Morser will connect to: ws://\$(hostname)/signal?room=…&peer=…"
echo    "    (or set window.MORSER_SIGNAL_HOST in index.html for a different host)"
