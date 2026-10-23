#!/bin/zsh
# prompt.sh next | send | reset: the Stream Deck's prompt keys for the live Grok Bot demo.
#   next    puts the next line of prompts.txt in Pantry's message box (doesn't send)
#   type N  puts prompt N there (used by the stage show)
#   send    sends what's in the box
#   reset   starts again from the first prompt
# It works through the accessibility API (bin/grok): no keystrokes and no clicks, so nothing can land in
# another app, and it refuses to type or send unless Pantry's chat is the one open.
DIR="${0:A:h}"
STEP="$DIR/.prompt-step"
BIN="$DIR/bin"
mkdir -p "$BIN"
[ -x "$BIN/grok" ] || swiftc -O "$DIR/src/grok.swift" -o "$BIN/grok" 2>/dev/null

case "${1:-next}" in
  reset) echo 0 > "$STEP" ;;
  next|type)
    n=$(( $(cat "$STEP" 2>/dev/null || echo 0) + 1 ))
    [ "$1" = type ] && n="$2"
    text=$(sed -n "${n}p" "$DIR/prompts.txt")
    [ -z "$text" ] && { osascript -e 'display notification "No more prompts" with title "Pantry"'; exit 0; }
    echo $n > "$STEP"
    "$BIN/grok" pantry >/dev/null && "$BIN/grok" prompt "$text" ;;
  send)
    "$BIN/grok" send ;;
esac
