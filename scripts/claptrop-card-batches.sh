#!/bin/bash
# claptrop-card-batches.sh — import a camera card that is bigger than the free disk, in batches.
#
#   bash scripts/claptrop-card-batches.sh "/Volumes/CLAPTROP 4" [batch-GB]
#
# Per batch (default ≤30 GB; all JPGs first, then RAFs, then videos):
#   copy card → ~/Desktop/<card> import/batch-N, md5-verify every file against the card,
#   run upload-to-drive.ts --sd on the batch, and only if that upload was clean delete
#   the batch's files from the card. Any failure stops with the card untouched.
# Safe to re-run: it plans from what is still on the card, and files already in Drive
# are skipped by the pipeline's duplicate check before being cleared.
set -u
CARD_ROOT="${1:?usage: claptrop-card-batches.sh <card volume> [batch-GB]}"
GB="${2:-30}"
CARD="$CARD_ROOT/DCIM"
PROJ="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$HOME/Desktop/$(basename "$CARD_ROOT") import"
LOGS="$WORK/logs"
STAGING="$HOME/Desktop/PHOTO UPLOADS"
ACT="$LOGS/activity.log"     # one line per file action, timestamped — the progress screen reads this
mkdir -p "$LOGS"
act() { echo "$(date '+%H:%M:%S')  $*" >> "$ACT"; }
cd "$PROJ" || exit 1
[ -d "$CARD" ] || { echo "No DCIM on $CARD_ROOT"; exit 1; }

pipeline_ok() {
  ! /usr/bin/grep -aqE "RAW zip for .* failed|failed to upload|Failed after|RAW kept locally|Retrying [0-9]+ failed" "$1"
}
staging_empty() {
  [ -z "$(find "$STAGING/jpg" "$STAGING/raf" "$STAGING/mov" -type f ! -name '.*' 2>/dev/null | head -1)" ]
}
wait_for_other_uploads() {
  while pgrep -f "scripts/upload-to-drive.ts" >/dev/null; do sleep 30; done
}

# Plan batches from what is on the card now.
python3 -I - "$CARD" "$LOGS/batches.json" "$GB" <<'EOF'
import os, sys, json, collections
card, out, gb = sys.argv[1], sys.argv[2], float(sys.argv[3])
# Whole card in type order — every JPG, then every RAF, then every video — so the
# photos land in Drive first. Within a type, card order.
RANK = {'.jpg': 0, '.jpeg': 0, '.heic': 0, '.png': 0, '.raf': 1, '.mov': 2, '.mp4': 2}
items = []
for root, _, files in sorted(os.walk(card)):
    for f in sorted(files):
        if f.startswith('.'):
            continue
        p = os.path.join(root, f)
        items.append((RANK.get(os.path.splitext(f)[1].lower(), 3), os.path.relpath(p, card), os.path.getsize(p)))
items.sort(key=lambda x: (x[0], x[1]))
batches, cur, size = [], [], 0
for _, rel, s in items:
    if cur and size + s > gb * 1e9:
        batches.append(cur); cur, size = [], 0
    cur.append(rel); size += s
if cur:
    batches.append(cur)
json.dump(batches, open(out, 'w'))
print(f"{sum(len(b) for b in batches)} files on card → {len(batches)} batch(es) of ≤{gb:g} GB")
EOF
n=$(python3 -I -c 'import json,sys;print(len(json.load(open(sys.argv[1]))))' "$LOGS/batches.json")

for i in $(seq 0 $((n-1))); do
  B="$WORK/batch-$i"; LIST="$LOGS/batch-$i.txt"
  python3 -I -c 'import json,sys;print("\n".join(json.load(open(sys.argv[1]))[int(sys.argv[2])]))' "$LOGS/batches.json" "$i" > "$LIST"
  bytes=$(python3 -I -c 'import os,sys;print(sum(os.path.getsize(os.path.join(sys.argv[1],l.strip())) for l in open(sys.argv[2]) if l.strip()))' "$CARD" "$LIST")
  free=$(( $(df -k "$HOME" | tail -1 | awk '{print $4}') * 1024 ))
  if [ "$free" -lt $(( bytes * 3 + 20000000000 )) ]; then echo "Not enough disk for batch $((i+1)) — stopping, card untouched"; exit 1; fi
  echo "-- batch $((i+1))/$n: $(wc -l < "$LIST" | tr -d ' ') files, $((bytes/1000000000)) GB $(date '+%H:%M')"
  act "════ BATCH $((i+1))/$n: $(wc -l < "$LIST" | tr -d ' ') files, $((bytes/1000000000)) GB ════"

  mkdir -p "$B/DCIM"
  act "STEP 1/3  copying card → Mac"
  # --log-file writes each file the moment it lands (stdout to a pipe would sit in a buffer).
  rsync -a --log-file="$ACT" --log-file-format="COPIED    %n  (%l bytes)" --files-from="$LIST" "$CARD/" "$B/DCIM/"
  [ "${PIPESTATUS[0]}" = 0 ] || { echo "Copy failed — stopping, card untouched"; act "COPY FAILED — card untouched"; exit 1; }
  act "STEP 2/3  verifying every copy against the card (md5)"
  python3 -I - "$CARD" "$B/DCIM" "$LIST" "$ACT" <<'EOF' || { echo "Verify FAILED — stopping, card untouched"; act "VERIFY FAILED — card untouched"; exit 1; }
import os, sys, hashlib
import time
card, copy, listing, actlog = sys.argv[1:5]
act = open(actlog, 'a', buffering=1)
def md5(p):
    h = hashlib.md5()
    with open(p, 'rb') as fh:
        for c in iter(lambda: fh.read(1 << 22), b''): h.update(c)
    return h.hexdigest()
names = [l.strip() for l in open(listing) if l.strip()]
bad = []
for k, r in enumerate(names, 1):
    ok = (os.path.isfile(os.path.join(copy, r))
          and os.path.getsize(os.path.join(card, r)) == os.path.getsize(os.path.join(copy, r))
          and md5(os.path.join(card, r)) == md5(os.path.join(copy, r)))
    if not ok: bad.append(r)
    act.write(f"{time.strftime('%H:%M:%S')}  {'VERIFIED' if ok else 'MISMATCH'}  {r}  ({k}/{len(names)})\n")
print(f"   verified {len(names) - len(bad)}/{len(names)} identical to card")
sys.exit(1 if bad else 0)
EOF

  wait_for_other_uploads
  act "STEP 3/3  uploading to Drive (JPG → RAW zips → MOV, into NEW UPLOADS/<date>)"
  node_modules/.bin/tsx scripts/upload-to-drive.ts --sd "$B" 2>&1 | tee "$LOGS/upload-$i.log" \
    | perl -ne 'BEGIN{$|=1} chomp; for (split /\r/) { next if /: \d+%\s*$/ || /^\s*$/ || /^\s*\[dotenv/; s/^\s+//; print "$_\n" }' \
    | while IFS= read -r line; do act "$line"; done
  left=$(find "$B" -type f ! -name '.*' | wc -l | tr -d ' ')
  if pipeline_ok "$LOGS/upload-$i.log" && staging_empty && [ "$left" = 0 ]; then
    python3 -I -c 'import os,sys
n=0
for l in open(sys.argv[2]):
    l=l.strip()
    if l: os.remove(os.path.join(sys.argv[1],l)); n+=1
print(f"   uploaded; cleared {n} files from card")' "$CARD" "$LIST"
    act "BATCH $((i+1)) DONE — uploaded clean, cleared its $(wc -l < "$LIST" | tr -d ' ') files off the card"
    rm -rf "$B"
  else
    act "BATCH $((i+1)) NOT CLEAN ($left left) — card files kept; will retry"
    echo "Upload of batch $((i+1)) not clean ($left files left) — card files kept, stopping (log: $LOGS/upload-$i.log)"; exit 1
  fi
done
echo "ALL BATCHES DONE: $(find "$CARD" -type f ! -name '.*' | wc -l | tr -d ' ') media files left on card"
