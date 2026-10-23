#!/bin/zsh
# logos.sh: fetch the marks the explainers show into video/logos/, from their owners' own sites (and Wikimedia
# Commons, simple-icons). They're the owners' trademarks, so they're not committed. Needs curl and uv.
DIR="${0:A:h}/logos"
mkdir -p $DIR && cd $DIR || exit 1
get() { curl -fsSL --max-time 60 -o "$1" "$2" && echo "$1 <- $2" || echo "!! $1: $2"; }
get agentcard.png  https://app.agentcard.sh/agentcard-mark.png
get cognee.png     https://www.cognee.ai/favicon.ico          # an 800 px PNG
get luma.png       https://luma.com/apple-touch-icon.png
get grok.svg       https://grok.com/images/favicon.svg
get gmail.svg      "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg"
get sainsburys.svg "https://upload.wikimedia.org/wikipedia/commons/d/d7/Sainsbury%27s_Logo.svg"
get notion.svg     https://unpkg.com/simple-icons@16.35.0/icons/notion.svg
get 1password.svg  https://unpkg.com/simple-icons@16.35.0/icons/1password.svg
# Agentcard's mark in white on clear, for the card face: the mark is white on blue, so green is its alpha
uv run --quiet --with pillow --with numpy python - <<'PY'
from PIL import Image
import numpy as np
a = np.asarray(Image.open('agentcard.png').convert('RGBA')).astype(float)
w = np.zeros_like(a); w[..., :3] = 255; w[..., 3] = a[..., 1] * a[..., 3] / 255
Image.fromarray(w.astype(np.uint8)).save('agentcard-white.png')
ys, xs = np.where(a[..., 1] > 128)
Image.fromarray(w.astype(np.uint8)).crop((xs.min() - 9, ys.min() - 9, xs.max() + 9, ys.max() + 9)).save('agentcard-mark-white.png')
PY
ls -la
