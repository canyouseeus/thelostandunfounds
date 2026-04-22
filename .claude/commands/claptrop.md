Paste this into your Mac terminal:

```bash
cd /Users/thelostunfounds/thelostandunfounds && npm install && node_modules/.bin/tsx scripts/upload-to-drive.ts
```

With a subject override (if SD card folders aren't organized by shoot name):

```bash
cd /Users/thelostunfounds/thelostandunfounds && node_modules/.bin/tsx scripts/upload-to-drive.ts --subject barbershop
```

**What it does:**
1. Builds a Drive file index (one walk per folder — no redundant API calls)
2. If disk < 2 GB free — flushes `~/Desktop/PHOTO UPLOADS/` to Drive and deletes local copies first
3. Imports from SD card at `/Volumes/CLAPTROP II/DCIM` — renames every file to `@tlau_YYYY-MM-DD_location_subject_###.ext`
4. Uploads all staged files to Drive — deletes each local file after confirmed upload
5. Writes rename log to `scripts/claptrop-rename-log.json`
