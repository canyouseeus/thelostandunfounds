#!/bin/bash
# claptrop-card-forever.sh — keep running claptrop-card-batches.sh until the card is empty.
#
#   bash scripts/claptrop-card-forever.sh "/Volumes/CLAPTROP 4"
#
# Meant to run under launchd (see the launchctl line in the claptrop docs) so it
# survives the Claude app quitting. Each pass is safe to repeat: files already in
# Drive are skipped, and card files are cleared only after a clean upload.
# Stops when the card is empty, the card is gone for 30 min, or 40 passes fail.
set -u
CARD_ROOT="${1:?usage: claptrop-card-forever.sh <card volume>}"
PROJ="$(cd "$(dirname "$0")/.." && pwd)"
LOGS="$HOME/Desktop/$(basename "$CARD_ROOT") import/logs"
mkdir -p "$LOGS"
LOG="$LOGS/forever.log"
exec >>"$LOG" 2>&1
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

left() { find "$CARD_ROOT/DCIM" -type f ! -name '.*' 2>/dev/null | wc -l | tr -d ' '; }

missing=0
for pass in $(seq 1 40); do
  if [ ! -d "$CARD_ROOT/DCIM" ]; then
    missing=$((missing+1))
    echo "$(date '+%m-%d %H:%M') card not mounted ($missing/6)"
    [ "$missing" -ge 6 ] && { echo "Card gone 30 min — giving up."; exit 1; }
    sleep 300; continue
  fi
  missing=0
  n=$(left)
  if [ "$n" = 0 ]; then echo "$(date '+%m-%d %H:%M') CARD EMPTY — all uploaded."; exit 0; fi
  echo "$(date '+%m-%d %H:%M') pass $pass: $n files on card"
  caffeinate -ims bash "$PROJ/scripts/claptrop-card-batches.sh" "$CARD_ROOT"
  rc=$?
  if [ "$rc" = 0 ] && [ "$(left)" = 0 ]; then echo "$(date '+%m-%d %H:%M') CARD EMPTY — all uploaded."; exit 0; fi
  echo "$(date '+%m-%d %H:%M') pass $pass ended (exit $rc) — retrying in 5 min"
  sleep 300
done
echo "Gave up after 40 passes — check $LOGS."
exit 1
