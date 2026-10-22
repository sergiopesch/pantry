#!/bin/zsh
# keyd.sh: runs the Stream Deck keys' commands. The key apps only append a line ("deck scene",
# "prompt next", ...) to .queue, which needs no macOS permission. This helper, started once from a terminal
# that already has Accessibility access, does the window moves and typing.
DIR="${0:A:h}"
Q="$DIR/.queue"
: > "$Q"
echo "keyd: watching $Q (Ctrl+C to stop)"
while true; do
  if [ -s "$Q" ]; then
    lines=("${(@f)$(cat "$Q")}"); : > "$Q"
    for l in $lines; do
      set -- ${=l}
      echo "$(date +%T) $l"
      case "$1" in
        deck) /bin/bash "$DIR/deck.sh" "$2" ;;
        prompt) /bin/zsh "$DIR/prompt.sh" "$2" ;;
      esac
    done
  fi
  sleep 0.1
done
