#!/bin/bash
# claptrop-pause.sh — pause / resume the CLAPTROP card upload in place.
#
#   bash scripts/claptrop-pause.sh pause    # freeze every runner process where it is
#   bash scripts/claptrop-pause.sh resume   # carry on from exactly that spot
#   bash scripts/claptrop-pause.sh status   # running | paused | stopped
#
# Pause sends SIGSTOP to the runner and everything under it (copy, verify, upload,
# caffeinate). Nothing is lost: a Drive upload interrupted by a long pause just
# retries when resumed, and card files are only ever cleared after a clean upload.
# While paused the Mac may sleep (caffeinate is frozen too).
set -u
LOGS="$HOME/Desktop/CLAPTROP 4 import/logs"
root=$(pgrep -f "bash scripts/claptrop-card-forever.sh" | head -1)
[ -z "$root" ] && { echo stopped; exit 0; }

tree() { # print pid and all descendants
  local p=$1; echo "$p"
  for c in $(pgrep -P "$p"); do tree "$c"; done
}
state=$(ps -o stat= -p "$root" | tr -d ' ')

case "${1:-status}" in
  pause)
    for p in $(tree "$root"); do kill -STOP "$p" 2>/dev/null; done
    echo "$(date '+%H:%M:%S')  ⏸ PAUSED — double-click RESUME, or press Resume on the dashboard" >> "$LOGS/activity.log"
    echo paused;;
  resume)
    for p in $(tree "$root" | tail -r); do kill -CONT "$p" 2>/dev/null; done
    echo "$(date '+%H:%M:%S')  ▶ RESUMED" >> "$LOGS/activity.log"
    echo running;;
  status)
    [[ "$state" == T* ]] && echo paused || echo running;;
esac
