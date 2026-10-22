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

# Split view: deck panel on the LEFT half (Chrome app window), Grok Bot on the RIGHT half.
# Screen 1710x1112 pt, menu bar 25 pt. Moving Grok Bot needs Accessibility permission for the key's applet.
if [ "$MODE" = "connect" ] || [ "$MODE" = "tools" ] || [ "$MODE" = "agentcard" ]; then
  PANEL_PROFILE="$HOME/Library/Application Support/PantryDeckPanel"
  open -na "Google Chrome" --args --user-data-dir="$PANEL_PROFILE" --no-first-run --no-default-browser-check \
    --disable-session-crashed-bubble --hide-crash-restore-bubble \
    --app="file://$STORY/index.html#$MODE" --window-position=0,25 --window-size=855,1087
  sleep 1.2
  # Enforce the left-half bounds on the newest panel window (the panel instance is the Chrome process using PantryDeckPanel).
  PID=$(pgrep -f "user-data-dir=$PANEL_PROFILE" | head -1)
  [ -n "$PID" ] && osascript -e "tell application \"System Events\" to tell (first process whose unix id is $PID) to try
    set position of window 1 to {0, 25}
    set size of window 1 to {855, 1087}
  end try" >/dev/null 2>&1
  osascript -e 'tell application "System Events" to tell process "Grok Bot"
    set frontmost to true
    set position of window 1 to {855, 25}
    set size of window 1 to {855, 1087}
  end tell' >/dev/null 2>&1
  exit 0
fi

# Grok Bot back to full width, in front. The side panel stays behind it.
if [ "$MODE" = "grokfull" ]; then
  open -a "Grok Bot"
  osascript -e 'tell application "System Events" to tell process "Grok Bot"
    set frontmost to true
    set position of window 1 to {0, 25}
    set size of window 1 to {1710, 1087}
  end tell' >/dev/null 2>&1
  exit 0
fi

if [ "$MODE" = "grok" ]; then
  open "$PANTRY_CHAT"
  sleep 0.4
  open -a "Grok Bot"   # bring the app forward even if the kiosk deck is in front
  osascript -e 'tell application "System Events" to tell process "Grok Bot"
    set frontmost to true
    set position of window 1 to {0, 25}
    set size of window 1 to {1710, 1087}
  end tell' >/dev/null 2>&1
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
# Make sure the full-screen deck comes in front of Grok Bot (e.g. for Wrap).
sleep 0.8
KPID=$(pgrep -f "user-data-dir=$PROFILE" | head -1)
[ -n "$KPID" ] && osascript -e "tell application \"System Events\" to set frontmost of (first process whose unix id is $KPID) to true" >/dev/null 2>&1
exit 0
