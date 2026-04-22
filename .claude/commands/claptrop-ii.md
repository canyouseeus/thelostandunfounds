Paste this into your Mac terminal:

```bash
cd /Users/thelostunfounds/thelostandunfounds && node_modules/.bin/tsx scripts/upload-to-drive.ts --skip-drive
```

With a subject override:

```bash
cd /Users/thelostunfounds/thelostandunfounds && node_modules/.bin/tsx scripts/upload-to-drive.ts --skip-drive --subject barbershop
```

**What it does:**
Same as `/claptrop` but stops after the SD card import — no Drive upload. Files stay in `~/Desktop/PHOTO UPLOADS/` until you're ready to sync.
