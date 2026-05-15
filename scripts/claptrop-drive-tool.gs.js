/**
 * CLAPTROP Drive Tool — Google Apps Script
 *
 * Paste into a new project at script.google.com, save, authorize the prompted
 * Drive scope on first run, then run one of the entrypoints below from the
 * function picker.
 *
 * Entrypoints:
 *   renameAllPhotos()   Walk JPG Archive venue folders, rename .jpg/.jpeg to
 *                       @tlau.photos_thelostandunfounds_YYYY-MM-DD_austin_<venue>_fuji_###.jpg
 *   removeDuplicates()  Index JPG Archive by md5+size, trash NEW UPLOADS files
 *                       (recursively) whose md5+size already exist in the archive.
 *   dryRunRename()      Same as renameAllPhotos() but logs only — no writes.
 *   runAll()            renameAllPhotos() then removeDuplicates().
 *
 * Idempotent: files already in canonical format are skipped, trashed dupes are
 * filtered out by Drive's default getFiles() iterator. The 5-minute soft
 * timeout (Apps Script's hard cap is 6m) means a long run will bail cleanly;
 * re-run to resume.
 *
 * Mirrors scripts/claptrop-namer.ts NAME_PREFIX + normalizeText + EXIF parser.
 */

const ARCHIVE_FOLDER_ID     = '1Ouha3XJOQJtgB8RxQDwKdDs5ryADYxD4';
const NEW_UPLOADS_FOLDER_ID = '1NwQJFj9YYsQrfQgHMWqzLjGWZHL7B2Ym';

const NAME_PREFIX  = '@tlau.photos_thelostandunfounds';
const SHORT_PREFIX = '@tlau_';
const DEFAULT_LOC  = 'austin';
const CAMERA_TAG   = 'fuji';

const TIMEOUT_MS = 5 * 60 * 1000;
const EXIF_BYTES = 65536;

// Folders that aren't real venues (mirrors GENERIC_FOLDER in claptrop-namer.ts,
// extended to skip the NEW UPLOADS staging folder).
const GENERIC_FOLDER_RE = /^(\d{3}[a-z]+|jpg|raf|mov|raw|dcim|photos?|videos?|camera|new[\s_]+uploads?)$/i;

// ─── public entrypoints ──────────────────────────────────────────────────────

function renameAllPhotos() { return _runRename(false); }
function dryRunRename()    { return _runRename(true);  }

function runAll() {
  renameAllPhotos();
  removeDuplicates();
}

function removeDuplicates() {
  const start = Date.now();
  const log = (m) => Logger.log(m);
  log('▶ removeDuplicates() starting…');

  const archiveIndex = _buildArchiveIndex(start, log);
  const indexSize = Object.keys(archiveIndex).length;
  log(`indexed ${indexSize} archive files by md5+size`);

  const newRoot = DriveApp.getFolderById(NEW_UPLOADS_FOLDER_ID);
  const counts = { scanned: 0, trashed: 0, kept: 0, missingMeta: 0, errored: 0 };

  _forEachFolderRecursive(newRoot, (folder) => {
    if (Date.now() - start > TIMEOUT_MS) return false;
    // Batch-fetch files in this folder via Drive API
    let pageToken = null;
    do {
      if (Date.now() - start > TIMEOUT_MS) {
        log(`⏱ timeout — scanned=${counts.scanned} trashed=${counts.trashed}`);
        return false;
      }
      let url = 'https://www.googleapis.com/drive/v3/files'
        + '?q=' + encodeURIComponent("'" + folder.getId() + "' in parents and trashed=false")
        + '&fields=' + encodeURIComponent('nextPageToken,files(id,name,md5Checksum,size)')
        + '&pageSize=1000';
      if (pageToken) url += '&pageToken=' + encodeURIComponent(pageToken);
      const res = UrlFetchApp.fetch(url, {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true,
      });
      if (res.getResponseCode() !== 200) { pageToken = null; break; }
      const data = JSON.parse(res.getContentText());
      for (const fileMeta of (data.files || [])) {
        if (!_isJpg(fileMeta.name)) continue;
        counts.scanned++;
        if (!fileMeta.md5Checksum || !fileMeta.size) { counts.missingMeta++; continue; }
        const key = `${fileMeta.md5Checksum}|${String(fileMeta.size)}`;
        if (archiveIndex[key]) {
          try {
            DriveApp.getFileById(fileMeta.id).setTrashed(true);
            counts.trashed++;
            log(`🗑 trashed ${fileMeta.name} (dupe of archive/${archiveIndex[key]})`);
          } catch (e) {
            counts.errored++;
            log(`✗ error trashing ${fileMeta.name}: ${e}`);
          }
        } else {
          counts.kept++;
        }
      }
      pageToken = data.nextPageToken || null;
    } while (pageToken);
  });

  log(`✓ removeDuplicates: scanned=${counts.scanned} trashed=${counts.trashed} kept=${counts.kept} missingMeta=${counts.missingMeta} errored=${counts.errored} elapsed=${Math.round((Date.now() - start) / 1000)}s`);
}

// ─── rename core ─────────────────────────────────────────────────────────────

function _runRename(dryRun) {
  const start = Date.now();
  const log = (m) => Logger.log(m);
  log(`▶ ${dryRun ? 'dryRunRename' : 'renameAllPhotos'}() starting…`);

  const archive = DriveApp.getFolderById(ARCHIVE_FOLDER_ID);
  const venueFolders = archive.getFolders();

  const totals = {
    folders: 0, skipGeneric: 0, scanned: 0,
    alreadyOk: 0, upgraded: 0, renamed: 0, errored: 0,
  };

  while (venueFolders.hasNext()) {
    if (Date.now() - start > TIMEOUT_MS) {
      log('⏱ timeout — bailing out (re-run to resume)');
      break;
    }
    const folder = venueFolders.next();
    const folderName = folder.getName();
    if (GENERIC_FOLDER_RE.test(folderName.trim())) {
      totals.skipGeneric++;
      log(`⏭ skip generic folder "${folderName}"`);
      continue;
    }
    totals.folders++;
    const venue = _normalize(folderName);
    if (!venue) {
      totals.skipGeneric++;
      log(`⏭ skip empty-normalized folder "${folderName}"`);
      continue;
    }
    log(`📂 venue "${folderName}" → ${venue}`);
    _processVenueFolder(folder, venue, dryRun, totals, start, log);
  }

  log(`✓ ${dryRun ? 'dryRun' : 'rename'}: folders=${totals.folders} skipGeneric=${totals.skipGeneric} scanned=${totals.scanned} alreadyOk=${totals.alreadyOk} upgraded=${totals.upgraded} renamed=${totals.renamed} errored=${totals.errored} elapsed=${Math.round((Date.now() - start) / 1000)}s`);
}

function _processVenueFolder(folder, venue, dryRun, totals, start, log) {
  // Pre-seed the per-date seq map from files already in canonical format so new
  // files continue numbering above whatever's there. Done in a single pass over
  // file names so we only call DriveApp once per folder.
  const seqMap = {}; // 'YYYY-MM-DD' → highest seq number seen
  const queue = [];

  const files = folder.getFiles();
  while (files.hasNext()) {
    const f = files.next();
    const name = f.getName();
    if (!_isJpg(name)) continue;
    queue.push(f);
    const parsed = _parseSeqFromCurrent(name);
    if (parsed) {
      if (!seqMap[parsed.date] || parsed.seq > seqMap[parsed.date]) {
        seqMap[parsed.date] = parsed.seq;
      }
    }
  }

  for (const f of queue) {
    if (Date.now() - start > TIMEOUT_MS) return;
    totals.scanned++;
    const name = f.getName();
    try {
      // Already canonical? Skip.
      if (_hasPrefix(name, NAME_PREFIX + '_')) {
        totals.alreadyOk++;
        continue;
      }

      // Legacy short prefix? Upgrade in place (preserve original date/loc/venue/seq,
      // just swap prefix and inject _fuji_).
      if (_hasPrefix(name, SHORT_PREFIX)) {
        const upgraded = _upgradeLegacyName(name);
        if (!upgraded) {
          totals.errored++;
          log(`✗ legacy name didn't parse: ${name}`);
          continue;
        }
        const finalName = _ensureUnique(upgraded, folder, name);
        if (finalName.toLowerCase() === name.toLowerCase()) {
          totals.alreadyOk++;
          continue;
        }
        log(`${dryRun ? '🟦 [dry]' : '✏'} upgrade ${name} → ${finalName}`);
        if (!dryRun) f.setName(finalName);
        const parsed = _parseSeqFromCurrent(finalName);
        if (parsed && (!seqMap[parsed.date] || parsed.seq > seqMap[parsed.date])) {
          seqMap[parsed.date] = parsed.seq;
        }
        totals.upgraded++;
        continue;
      }

      // Otherwise: build a fresh canonical name from EXIF (or createdTime fallback).
      const date = _resolveDateForFile(f);
      const seq = _nextSeq(seqMap, date);
      const ext = _ext(name);
      const target = `${NAME_PREFIX}_${date}_${DEFAULT_LOC}_${venue}_${CAMERA_TAG}_${_pad3(seq)}${ext}`;
      const finalName = _ensureUnique(target, folder, name);
      log(`${dryRun ? '🟦 [dry]' : '✏'} rename ${name} → ${finalName}`);
      if (!dryRun) f.setName(finalName);
      totals.renamed++;
    } catch (e) {
      totals.errored++;
      log(`✗ error on ${name}: ${e}`);
    }
  }
}

// ─── archive index for dedup ─────────────────────────────────────────────────

function _buildArchiveIndex(start, log) {
  const index = {};
  const archive = DriveApp.getFolderById(ARCHIVE_FOLDER_ID);
  const folders = archive.getFolders();
  while (folders.hasNext()) {
    if (Date.now() - start > TIMEOUT_MS) {
      log('⏱ timeout while indexing archive — partial index');
      return index;
    }
    const f = folders.next();
    const fname = f.getName();
    if (GENERIC_FOLDER_RE.test(fname.trim())) continue;
    // Batch-fetch file metadata via Drive v3 files.list (up to 1000/page)
    let pageToken = null;
    do {
      if (Date.now() - start > TIMEOUT_MS) return index;
      let url = 'https://www.googleapis.com/drive/v3/files'
        + '?q=' + encodeURIComponent("'" + f.getId() + "' in parents and trashed=false")
        + '&fields=' + encodeURIComponent('nextPageToken,files(id,name,md5Checksum,size)')
        + '&pageSize=1000';
      if (pageToken) url += '&pageToken=' + encodeURIComponent(pageToken);
      const res = UrlFetchApp.fetch(url, {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true,
      });
      if (res.getResponseCode() !== 200) { pageToken = null; break; }
      const data = JSON.parse(res.getContentText());
      for (const file of (data.files || [])) {
        if (!_isJpg(file.name)) continue;
        if (!file.md5Checksum || !file.size) continue;
        const key = `${file.md5Checksum}|${String(file.size)}`;
        if (!index[key]) index[key] = `${fname}/${file.name}`;
      }
      pageToken = data.nextPageToken || null;
    } while (pageToken);
  }
  return index;
}

function _forEachJpgRecursive(folder, cb) {
  const files = folder.getFiles();
  while (files.hasNext()) {
    const f = files.next();
    if (_isJpg(f.getName())) {
      const cont = cb(f);
      if (cont === false) return false;
    }
  }
  const subs = folder.getFolders();
  while (subs.hasNext()) {
    const sub = subs.next();
    const cont = _forEachJpgRecursive(sub, cb);
    if (cont === false) return false;
  }
}

// Walk folders recursively — calls cb(folder) on the folder itself and all subfolders
function _forEachFolderRecursive(folder, cb) {
  const cont = cb(folder);
  if (cont === false) return false;
  const subs = folder.getFolders();
  while (subs.hasNext()) {
    const sub = subs.next();
    const cont2 = _forEachFolderRecursive(sub, cb);
    if (cont2 === false) return false;
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function _isJpg(name) { return /\.jpe?g$/i.test(name); }
function _ext(name)   { const m = name.match(/\.(jpe?g)$/i); return m ? '.' + m[1].toLowerCase() : '.jpg'; }
function _pad3(n)     { return ('00' + n).slice(-3); }
function _hasPrefix(name, prefix) { return name.toLowerCase().indexOf(prefix.toLowerCase()) === 0; }

function _normalize(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, '_');
}

// Parse a canonical file name and return { date, seq } for sequence tracking.
// Tolerant of the venue containing underscores (post-normalization).
function _parseSeqFromCurrent(name) {
  if (!_hasPrefix(name, NAME_PREFIX + '_')) return null;
  const dm = name.match(/_(\d{4}-\d{2}-\d{2})_/);
  const sm = name.match(/_(\d{3})\.jpe?g$/i);
  if (!dm || !sm) return null;
  return { date: dm[1], seq: parseInt(sm[1], 10) };
}

// Convert legacy short-prefix file to canonical.
//   @tlau_2026-04-15_austin_my_venue_001.jpg
//   →  @tlau.photos_thelostandunfounds_2026-04-15_austin_my_venue_fuji_001.jpg
function _upgradeLegacyName(name) {
  const m = name.match(/^@tlau_(\d{4}-\d{2}-\d{2})_(.+?)_(\d{3})\.(jpe?g)$/i);
  if (!m) return null;
  const date = m[1], middle = m[2], seq = m[3], ext = m[4].toLowerCase();
  return `${NAME_PREFIX}_${date}_${middle}_${CAMERA_TAG}_${seq}.${ext}`;
}

// Bump the trailing _### if a file with the candidate name already exists in
// the folder. Caps at 1000 attempts as a safety valve.
function _ensureUnique(target, folder, originalName) {
  if (target.toLowerCase() === originalName.toLowerCase()) return target;
  let candidate = target;
  for (let i = 0; i < 1000; i++) {
    if (!_folderHasFileNamed(folder, candidate)) return candidate;
    const m = candidate.match(/^(.*)_(\d{3})\.(jpe?g)$/i);
    if (!m) return candidate;
    const next = parseInt(m[2], 10) + 1;
    candidate = `${m[1]}_${_pad3(next)}.${m[3].toLowerCase()}`;
  }
  return candidate;
}

function _folderHasFileNamed(folder, name) {
  return folder.getFilesByName(name).hasNext();
}

function _nextSeq(seqMap, date) {
  const next = (seqMap[date] || 0) + 1;
  seqMap[date] = next;
  return next;
}

// ─── EXIF + Drive metadata over the REST API ─────────────────────────────────

function _resolveDateForFile(file) {
  try {
    const exifDate = _readExifDate(file.getId());
    if (exifDate) return exifDate;
  } catch (_) { /* fall through to Drive's createdTime */ }
  const d = file.getDateCreated() || new Date();
  return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
}

function _readExifDate(fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = UrlFetchApp.fetch(url, {
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
      Range: `bytes=0-${EXIF_BYTES - 1}`,
    },
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code !== 200 && code !== 206) return null;
  return _parseJpegDateTimeOriginal(res.getContent());
}

function _getDriveMeta(fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,size,md5Checksum`;
  const res = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) return null;
  const json = JSON.parse(res.getContentText());
  // size comes back as a string in Drive v3
  if (json.size) json.size = String(json.size);
  return json;
}

// JPEG SOI → APP1 (Exif) → TIFF → IFD0 → ExifIFD (0x8769) → DateTimeOriginal (0x9003).
// Apps Script byte arrays are signed; everything goes through u() to read unsigned.
// Mirrors parseExifFromBuffer in scripts/claptrop-namer.ts.
function _parseJpegDateTimeOriginal(bytes) {
  const u = (i) => bytes[i] & 0xff;
  if (bytes.length < 4 || u(0) !== 0xff || u(1) !== 0xd8) return null;

  let pos = 2;
  while (pos + 3 < bytes.length) {
    if (u(pos) !== 0xff) break;
    const marker = u(pos + 1);
    pos += 2;
    if (marker === 0xd9 || marker === 0xda) break; // EOI / SOS
    if (pos + 1 >= bytes.length) break;
    const segLen = (u(pos) << 8) | u(pos + 1);
    const segEnd = pos + segLen;

    // APP1 with "Exif\0\0" header
    if (marker === 0xe1 && segLen > 10 &&
        u(pos + 2) === 0x45 && u(pos + 3) === 0x78 &&
        u(pos + 4) === 0x69 && u(pos + 5) === 0x66 &&
        u(pos + 6) === 0x00 && u(pos + 7) === 0x00) {

      const tStart = pos + 8;
      const le = u(tStart) === 0x49 && u(tStart + 1) === 0x49;
      const r16 = (o) => le ? (u(o) | (u(o + 1) << 8)) : ((u(o) << 8) | u(o + 1));
      const r32 = (o) => le
        ? ((u(o) | (u(o + 1) << 8) | (u(o + 2) << 16) | (u(o + 3) << 24)) >>> 0)
        : (((u(o) << 24) | (u(o + 1) << 16) | (u(o + 2) << 8) | u(o + 3)) >>> 0);

      const ifd0Off = tStart + r32(tStart + 4);
      if (ifd0Off + 2 > bytes.length) { pos = segEnd; continue; }

      const ifd0Cnt = r16(ifd0Off);
      let exifOff = 0;
      for (let i = 0; i < ifd0Cnt; i++) {
        const e = ifd0Off + 2 + i * 12;
        if (e + 12 > bytes.length) break;
        if (r16(e) === 0x8769) { exifOff = tStart + r32(e + 8); break; }
      }

      if (exifOff > 0 && exifOff + 2 <= bytes.length) {
        const cnt = r16(exifOff);
        for (let i = 0; i < cnt; i++) {
          const e = exifOff + 2 + i * 12;
          if (e + 12 > bytes.length) break;
          if (r16(e) === 0x9003) {
            const valOff = tStart + r32(e + 8);
            if (valOff + 19 <= bytes.length) {
              let str = '';
              for (let k = 0; k < 19; k++) str += String.fromCharCode(u(valOff + k));
              const m = str.match(/^(\d{4}):(\d{2}):(\d{2}) /);
              if (m) return `${m[1]}-${m[2]}-${m[3]}`;
            }
            return null;
          }
        }
      }
    }
    pos = segEnd;
  }
  return null;
}
