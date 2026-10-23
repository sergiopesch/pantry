#!/bin/zsh
# record-run.sh [work dir]: film the live Grok Bot run for the demo video.
# Pantry's chat, window-only at 60 fps (ScreenCaptureKit: no cursor, no notifications, no other windows),
# driven through accessibility with the four prompts in ../streamdeck/prompts.txt. It logs a timeline
# (events.jsonl, state.jsonl) for the edit, then puts the windows back. Run it from a terminal with
# Accessibility and Screen Recording access, with nobody using the Mac (about 4 minutes).
DIR="${0:A:h}"
G="$DIR/../streamdeck/bin/grok"
P="$DIR/../streamdeck/prompts.txt"
WORK=${PANTRY_VIDEO_WORK:-/tmp/pantry-video}
OUT=${1:-$WORK/run}
REC="$WORK/bin/screenrec"
mkdir -p $OUT "$WORK/bin"; : > $OUT/events.jsonl; : > $OUT/state.jsonl
[ -x "$G" ] || swiftc -O "$DIR/../streamdeck/src/grok.swift" -o "$G"
[ -x "$REC" ] || swiftc -O "$DIR/screenrec.swift" -o "$REC"
now() { python3 -c 'import time;print(f"{time.time():.3f}")'; }
T0=0
ev() { echo "{\"t\": $(python3 -c "print(round($(now) - $T0, 3))"), \"event\": \"$1\"${2:+, $2}}" >> $OUT/events.jsonl; echo "[$(date +%T)] $1 $2"; }
prompt() { sed -n "${1}p" $P; }

# --- setup (not filmed) ---
osascript -e 'tell application "Grok Bot" to activate'; sleep 0.8
$G at 205 1159 1600 900; sleep 0.5        # asks for the Retina screen; macOS may keep it where it is
$G compact on; $G pantry
$G prompt "Filming now. Run node ~/pantry/src/cli.js event reset rehearsal, then reply \"Ready.\" only." && $G send
sleep 4; $G wait 120 >/dev/null
sleep 1

# --- filmed ---
"$REC" --window "Grok Bot" --fps 60 --out $OUT/grok.mov > $OUT/rec.log 2>&1 &
RECPID=$!
sleep 1.2
T0=$(now)
ev rec-start
( while kill -0 $RECPID 2>/dev/null; do
    echo "{\"t\": $(python3 -c "print(round($(now) - $T0, 3))"), \"state\": $($G state 2>/dev/null)}" >> $OUT/state.jsonl
    sleep 0.35
  done ) &
LOG=$!

sleep 1.5; $G prompt "$(prompt 1)" >/dev/null; ev typed '"prompt": 1'
sleep 6; $G send >/dev/null; ev sent '"prompt": 1'
$G wait 300 >/dev/null; ev done '"prompt": 1'
sleep 1.5; $G image 1 recent >/dev/null && { ev image-open '"card": "plan"'; sleep 8; $G close >/dev/null; ev image-close; }

sleep 1.5; $G prompt "$(prompt 2)" >/dev/null; ev typed '"prompt": 2'
sleep 5; $G send >/dev/null; ev sent '"prompt": 2'
$G wait 300 >/dev/null; ev done '"prompt": 2'
sleep 1.5; $G image 3 recent >/dev/null && { ev image-open '"card": "coeliac meal"'; sleep 6.5; $G close >/dev/null; ev image-close; }

sleep 1.5; $G prompt "$(prompt 3)" >/dev/null; ev typed '"prompt": 3'
sleep 5; $G send >/dev/null; ev sent '"prompt": 3'
$G wait 300 >/dev/null; ev done '"prompt": 3'
sleep 3

$G prompt "$(prompt 4)" >/dev/null; ev typed '"prompt": 4'
sleep 6; $G send >/dev/null; ev sent '"prompt": 4'
$G wait 400 >/dev/null; ev done '"prompt": 4'
sleep 1.5; $G image 1 recent >/dev/null && { ev image-open '"card": "payment"'; sleep 8; $G close >/dev/null; ev image-close; }
sleep 2.5; ev rec-stop
kill -INT $RECPID; wait $RECPID 2>/dev/null; kill $LOG 2>/dev/null
cat $OUT/rec.log

# --- put things back ---
$G compact off; $G at 352 62 855 983
osascript -e 'tell application "Ghostty" to activate' 2>/dev/null
echo "filmed: $OUT/grok.mov"
