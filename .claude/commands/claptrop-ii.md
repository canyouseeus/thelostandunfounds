Paste this into your Mac terminal:

```bash
cd /Users/thelostunfounds/thelostandunfounds && node_modules/.bin/tsx scripts/upload-to-drive.ts --skip-drive
```

With a subject override:

```bash
cd /Users/thelostunfounds/thelostandunfounds && node_modules/.bin/tsx scripts/upload-to-drive.ts --skip-drive --subject barbershop
```

If several cards are mounted at once, or you want to force a specific one:

```bash
cd /Users/thelostunfounds/thelostandunfounds && node_modules/.bin/tsx scripts/upload-to-drive.ts --skip-drive --sd "/Volumes/CLAPTROP IV"
```

**What it does:**
Same as `/claptrop` but stops after the SD card import — no Drive upload. Files stay in `~/Desktop/PHOTO UPLOADS/` until you're ready to sync.

**Card discovery:**
The card is found by scanning `/Volumes` for any mounted volume that contains a `DCIM` folder — the card's name doesn't matter. One match is used automatically; multiple matches exit nonzero and ask for `--sd`; no match logs that no card was found (and that `--sd` exists) before falling through to the staging flush. A card that's found but yields zero copied files is now an error, not a silent success.
