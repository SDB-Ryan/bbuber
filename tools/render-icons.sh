#!/bin/sh
# Turns icons/icon.svg, icons/favicon.svg and icons/og.svg (link preview) into the PNG sizes phones and
# browsers expect. Uses Chrome's built-in screenshot mode and macOS sips.
# Run from the project folder:  sh tools/render-icons.sh
set -e
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
cd "$(dirname "$0")/../icons"
"$CH" --headless --disable-gpu --hide-scrollbars --screenshot="$PWD/icon-512.png" --window-size=512,512 "file://$PWD/icon.svg" 2>/dev/null
"$CH" --headless --disable-gpu --hide-scrollbars --default-background-color=00000000 --screenshot="$PWD/fav-512.png" --window-size=512,512 "file://$PWD/favicon.svg" 2>/dev/null
"$CH" --headless --disable-gpu --hide-scrollbars --screenshot="$PWD/og.png" --window-size=1200,630 "file://$PWD/og.svg" 2>/dev/null
sips -z 192 192 icon-512.png --out icon-192.png >/dev/null
sips -z 180 180 icon-512.png --out apple-touch-icon.png >/dev/null
sips -z 32 32 fav-512.png --out favicon-32.png >/dev/null
rm fav-512.png
ls -1 *.png
