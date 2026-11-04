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
3. Finds the SD card automatically — any mounted volume under `/Volumes` that contains a `DCIM` folder, whatever the card is named — then imports from it, renaming every file to `@tlau_YYYY-MM-DD_location_subject_###.ext`
4. Uploads all staged files to Drive — deletes each local file after confirmed upload
5. Writes rename log to `scripts/claptrop-rename-log.json`

**Picking a card explicitly (`--sd`):**

```bash
cd /Users/thelostunfounds/thelostandunfounds && node_modules/.bin/tsx scripts/upload-to-drive.ts --sd "/Volumes/CLAPTROP IV"
```

- Exactly one card mounted → it's used automatically and logged by name.
- Several mounted → the script refuses to guess: it lists them and exits nonzero, asking for `--sd`.
- None mounted → it says so clearly, reminds you about `--sd`, and falls through to flushing existing staging to Drive.
- Card found but zero files copied → reported loudly and exits nonzero, instead of printing "Done".

`--sd` accepts either the volume root (`/Volumes/CLAPTROP IV`) or the `DCIM` folder inside it.
