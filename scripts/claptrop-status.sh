#!/bin/bash
# claptrop-status.sh — live, scrolling feed of the CLAPTROP card upload.
#
#   bash scripts/claptrop-status.sh "/Volumes/CLAPTROP 4" [files-at-start]
#
# Prints every line the runner writes to logs/activity.log the moment it is written
# (each file copied, verified, uploaded, skipped, cleared), plus a one-line progress
# summary every 30 s. Read-only. Ctrl-C or closing the window does not stop the upload.
CARD_ROOT="${1:-/Volumes/CLAPTROP 4}"
START="${2:-5625}"
WORK="$HOME/Desktop/$(basename "$CARD_ROOT") import"
LOGS="$WORK/logs"
ACT="$LOGS/activity.log"
G=$'\e[32m'; Y=$'\e[33m'; R=$'\e[31m'; C=$'\e[36m'; B=$'\e[1m'; D=$'\e[2m'; N=$'\e[0m'
touch "$ACT"

count() { find "$@" -type f ! -name '.*' 2>/dev/null | wc -l | tr -d ' '; }
summary() {
  local left cur hdr tot bi cp vf up sk zp run
  pgrep -f "claptrop-card-forever.sh|claptrop-card-batches.sh" >/dev/null && run="${G}RUNNING${N}" || run="${R}STOPPED — double-click RUN-CLAPTROP-4-UPLOAD.command${N}"
  left=$( [ -d "$CARD_ROOT/DCIM" ] && count "$CARD_ROOT/DCIM" || echo "card not mounted")
  cur=$(awk '/════ BATCH/{buf=""} {buf=buf $0 "\n"} END{printf "%s", buf}' "$ACT")
  hdr=$(echo "$cur" | /usr/bin/grep -m1 "════ BATCH" | sed -E 's/.*════ (BATCH [0-9]+\/[0-9]+).*/\1/')
  tot=$(echo "$cur" | /usr/bin/grep -m1 "════ BATCH" | sed -nE 's/.*: ([0-9]+) files.*/\1/p')
  bi=$(( $(echo "$hdr" | sed -nE 's/BATCH ([0-9]+).*/\1/p' | grep . || echo 1) - 1 ))
  cp=$(count "$WORK/batch-$bi"); vf=$(echo "$cur" | /usr/bin/grep -c "VERIFIED")
  up=$(echo "$cur" | /usr/bin/grep -c "✅ Uploaded"); sk=$(echo "$cur" | /usr/bin/grep -c "Skipping ")
  zp=$(echo "$cur" | /usr/bin/grep -c "uploaded + verified")
  echo "${B}── $(date '+%-I:%M:%S %p') · ${run}${B} · card: $((START - ${left//[^0-9]/0}))/$START cleared, $left left · ${hdr:-—}: copied $cp/${tot:-?} · verified $vf · uploaded $up · already in Drive $sk · RAW zips $zp ──${N}"
}
colorize() {
  while IFS= read -r l; do
    # rsync writes its lines without a time; stamp them as they arrive
    [[ "$l" =~ ^[0-9]{2}:[0-9]{2}:[0-9]{2} ]] || l="$(date '+%H:%M:%S')  $l"
    case "$l" in
      *FAILED*|*MISMATCH*|*NOT\ CLEAN*|*❌*)       echo "${R}$l${N}";;
      *✅*|*DONE\ —*|*"uploaded + verified"*)      echo "${G}$l${N}";;
      *════*|*STEP\ *|*WAITING*)                   echo "${Y}$l${N}";;
      *COPIED*|*VERIFIED*)                         echo "${D}$l${N}";;
      *Uploading*|*Zipping*)                       echo "${C}$l${N}";;
      *)                                           echo "$l";;
    esac
  done
}

clear
echo "${B}CLAPTROP UPLOAD — $(basename "$CARD_ROOT")${N} — live feed. Every file prints as it happens."
echo "${D}Closing this window does NOT stop the upload. Keep the lid open and the card in.${N}"
summary
( while sleep 30; do summary; done ) &
trap 'kill $! 2>/dev/null' EXIT
tail -n 25 -F "$ACT" 2>/dev/null | colorize
