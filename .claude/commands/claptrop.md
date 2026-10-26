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
6. Renames existing Drive files + gallery titles (retrograde)
7. **Drive tidy** — moves byte-identical copies already in Drive to the trash (same Drive md5 + size;
   a file the website uses is never touched), then files every RAW into `RAW/YYYY-MM-DD` by the
   capture date inside the RAF. The first run sorts the whole archive and takes a while; after that
   only new uploads move.

**Preview the cleanup before the first run** (nothing changes without `--apply`):

```bash
cd /Users/thelostunfounds/thelostandunfounds && node_modules/.bin/tsx scripts/claptrop-drive-tidy.ts --dedupe --sort
```

**Zip the RAW date folders** (separate, long-running — downloads each RAW, uploads `YYYY-MM-DD_partN.zip`
of up to 2 GB, trashes the originals only after Drive confirms the zip byte-for-byte). It measures one
real RAW first and stops if zipping saves under 10% (e.g. lossless-compressed RAWs):

```bash
node_modules/.bin/tsx scripts/claptrop-drive-tidy.ts --zip                       # plan only
node_modules/.bin/tsx scripts/claptrop-drive-tidy.ts --zip --apply --folder 2026-05-06   # one day first
node_modules/.bin/tsx scripts/claptrop-drive-tidy.ts --zip --apply               # everything
```

Each zip gets a `…_partN.manifest.json` beside it, so CLAPTROP still knows those RAWs are in Drive and
won't upload them again.
