#!/bin/zsh
# prompt.sh next | send | reset: the Stream Deck's prompt keys for the live Grok Bot demo.
#   next   clears Pantry's chat box and types the next line of prompts.txt (doesn't send)
#   send   sends what's in the chat box (a real click on Grok Bot's send button)
#   reset  starts again from the first prompt
DIR="${0:A:h}"
PANTRY="5ab715a0-38f1-42bb-b342-f792ecd90270"
STEP="$DIR/.prompt-step"
BIN="$DIR/bin"
mkdir -p "$BIN"
for t in click winbounds; do [ -x "$BIN/$t" ] || swiftc -O "$DIR/src/$t.swift" -o "$BIN/$t" 2>/dev/null; done

front() {
  osascript -e 'tell application "Grok Bot" to activate' >/dev/null; sleep 0.5
  read X Y W H <<< $("$BIN/winbounds")
}

case "${1:-next}" in
  reset) echo 0 > "$STEP" ;;
  next)
    n=$(( $(cat "$STEP" 2>/dev/null || echo 0) + 1 ))
    text=$(sed -n "${n}p" "$DIR/prompts.txt")
    [ -z "$text" ] && { osascript -e 'display notification "No more prompts" with title "Pantry"'; exit 0; }
    echo $n > "$STEP"
    front
    "$BIN/click" $((X + W * 62 / 100)) $((Y + H - 40)); sleep 0.25
    osascript -e 'tell application "System Events" to keystroke "a" using command down' -e 'delay 0.15' -e 'tell application "System Events" to key code 51'
    sleep 0.3
    url=$(python3 -c 'import sys,urllib.parse as u; print("grokbot://app/v1/prompt?id="+sys.argv[1]+"&text="+u.quote(sys.argv[2]))' "$PANTRY" "$text")
    open "$url" ;;
  send)
    front
    S=$(python3 -c "print($W/782)")
    "$BIN/click" $(python3 -c "print($X+$W-37*$S)") $(python3 -c "print($Y+$H-36*$S)") ;;
esac
