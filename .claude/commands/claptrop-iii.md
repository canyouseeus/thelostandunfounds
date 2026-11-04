Paste this into your Mac terminal:

```bash
cd /Users/thelostunfounds/thelostandunfounds && node_modules/.bin/tsx scripts/upload-to-drive.ts
```

With an explicit card (when more than one card is mounted):

```bash
cd /Users/thelostunfounds/thelostandunfounds && node_modules/.bin/tsx scripts/upload-to-drive.ts --sd "/Volumes/CLAPTROP IV"
```

Same command as `/claptrop` — the difference is intent. Use `/claptrop-iii` when you know there are files already sitting in `~/Desktop/PHOTO UPLOADS/` from a previous session that didn't get uploaded yet. The script will catch and upload all of them alongside any new SD card imports.

Card discovery is automatic (any mounted volume containing `DCIM`), so this works no matter which card is in the reader or what it's named. With no card mounted it logs that no card was found and just flushes staging, which is the usual `/claptrop-iii` case.

**To rename photos already in Google Drive and update THE GALLERY:**

```bash
# Preview first (no changes made)
node_modules/.bin/tsx scripts/claptrop-retrograde.ts --dry-run

# Apply to all galleries
node_modules/.bin/tsx scripts/claptrop-retrograde.ts

# Apply to one gallery only
node_modules/.bin/tsx scripts/claptrop-retrograde.ts --library kattitude-tattoo
```
