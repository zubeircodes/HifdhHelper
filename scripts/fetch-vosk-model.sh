#!/usr/bin/env bash
# Download a Vosk model and repack it for vosk-browser.
#
# Official Vosk models ship as .zip; vosk-browser's createModel() wants a
# gzipped tar. This downloads, unzips, repacks, and drops the result in
# public/models/ (gitignored — these are hundreds of megabytes).
#
#   ./scripts/fetch-vosk-model.sh            # default: Arabic MSA
#   ./scripts/fetch-vosk-model.sh ar-tn      # lighter Arabic, Tunisian dialect
#   ./scripts/fetch-vosk-model.sh en-small   # 40 MB, for checking the plumbing
#
# Then open /recite/vosk and pick the matching model.

set -euo pipefail

KEY="${1:-ar-mgb2}"

case "$KEY" in
  ar-mgb2)
    NAME="vosk-model-ar-mgb2-0.4"
    NOTE="Arabic, Modern Standard, 318 MB, Apache-2.0"
    ;;
  ar-tn)
    NAME="vosk-model-small-ar-tn-0.1-linto"
    NOTE="Arabic, Tunisian dialect, 158 MB, Apache-2.0"
    ;;
  en-small)
    NAME="vosk-model-small-en-us-0.15"
    NOTE="English, 40 MB — only for verifying the pipeline runs"
    ;;
  *)
    echo "unknown model key: $KEY  (expected ar-mgb2 | ar-tn | en-small)" >&2
    exit 1
    ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/public/models"
OUT="$OUT_DIR/$NAME.tar.gz"
URL="https://alphacephei.com/vosk/models/$NAME.zip"

if [ -f "$OUT" ]; then
  echo "already present: ${OUT#"$ROOT"/}  ($(du -h "$OUT" | cut -f1))"
  exit 0
fi

mkdir -p "$OUT_DIR"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "model : $NAME"
echo "note  : $NOTE"
echo "from  : $URL"
echo

curl -fL --progress-bar "$URL" -o "$TMP/model.zip"
unzip -q "$TMP/model.zip" -d "$TMP/x"

# vosk-browser expects the model directory at the archive root.
DIR="$(find "$TMP/x" -maxdepth 1 -mindepth 1 -type d | head -1)"
[ -n "$DIR" ] || { echo "no directory inside the zip" >&2; exit 1; }

tar -czf "$OUT" -C "$(dirname "$DIR")" "$(basename "$DIR")"

echo
echo "wrote ${OUT#"$ROOT"/}  ($(du -h "$OUT" | cut -f1))"
echo "serve path: /models/$NAME.tar.gz"
