#!/bin/bash
# Render assets/icons/*.svg to 1024px PNGs with headless Chrome: bash scripts/render-icons.sh
set -euo pipefail
cd "$(dirname "$0")/../assets/icons"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for svg in *.svg; do
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=1024,1024 \
    --screenshot="$PWD/${svg%.svg}.png" "file://$PWD/$svg" >/dev/null 2>&1
  echo "rendered ${svg%.svg}.png"
done
