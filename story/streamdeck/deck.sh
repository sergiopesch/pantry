#!/bin/bash
# Pantry deck driver for the Stream Deck keys.
# Usage: deck.sh scene | pantry | wrap | idle | grok
# Deck modes open story/index.html#<mode> in a dedicated, full-screen (kiosk) Chrome instance with its own
# profile, so Sergio's normal Chrome is untouched and no permission prompts are needed. Every press loads the
# deck fresh, which is also what makes "Reset" a real reset.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
STORY="$(dirname "$DIR")"
MODE="${1:-idle}"
PANTRY_CHAT="grokbot://app/v1/agent?id=5ab715a0-38f1-42bb-b342-f792ecd90270"

if [ "$MODE" = "grok" ]; then
  open "$PANTRY_CHAT"
  sleep 0.4
  open -a "Grok Bot"   # bring the app forward even if the kiosk deck is in front
  exit 0
fi

# Optional live numbers for the close: put CAME=118 and/or SIGNED=190 in tonight.env (only numbers you counted).
CAME=""; SIGNED=""
[ -f "$DIR/tonight.env" ] && . "$DIR/tonight.env"
Q=""
[ -n "$CAME" ] && Q="came=$CAME"
[ -n "$SIGNED" ] && Q="${Q:+$Q&}signed=$SIGNED"
URL="file://$STORY/index.html${Q:+?$Q}#$MODE"

PROFILE="$HOME/Library/Application Support/PantryDeckChrome"
open -na "Google Chrome" --args --user-data-dir="$PROFILE" --kiosk --no-first-run --no-default-browser-check \
  --disable-session-crashed-bubble --hide-crash-restore-bubble --autoplay-policy=no-user-gesture-required "$URL"
