/**
 * CLAPTROP Naming Engine
 * Builds @tlau_YYYY-MM-DD_location_subject_###.ext filenames for all TLAU assets.
 * No external dependencies — pure Node.js EXIF parsing + Nominatim geocoding.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExifData {
  dateTaken: Date | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ClaptropMeta {
  filename: string; // @tlau_2026-04-15_austin_barbershop_001.jpg
  stem: string;     // @tlau_2026-04-15_austin_barbershop_001
  dateStr: string;  // 2026-04-15
  location: string; // austin
  subject: string;  // barbershop
  seq: string;      // 001
}

export interface RenameLog {
  original: string;
  renamed: string;
  date_source: 'EXIF' | 'drive' | 'mtime' | 'fallback';
  location_source: 'GPS' | 'drive' | 'fallback';
  timestamp: string;
}

// ─── Text Normalization ───────────────────────────────────────────────────────

export function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')   // keep alphanumeric
    .trim()
    .replace(/\s+/g, '_');
}

// ─── JPEG EXIF Parser (no external deps) ─────────────────────────────────────

export function parseExifDate(s: string): Date | null {
  const m = s.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
  return isNaN(d.getTime()) ? null : d;
}

export function parseExifFromBuffer(buf: Buffer): ExifData {
  const result: ExifData = { dateTaken: null, latitude: null, longitude: null };

  // Verify JPEG SOI marker
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return result;

  let pos = 2;
  while (pos + 3 < buf.length) {
    if (buf[pos] !== 0xff) break;
    const marker = buf[pos + 1];
    pos += 2;
    if (marker === 0xd9 || marker === 0xda) break; // EOI / SOS

    if (pos + 1 >= buf.length) break;
    const segLen = buf.readUInt16BE(pos);
    const segEnd = pos + segLen;

    // APP1 — look for Exif header
    if (marker === 0xe1 && segLen > 10 &&
        buf.slice(pos + 2, pos + 8).toString('ascii') === 'Exif\0\0') {

      const t = buf.slice(pos + 8); // TIFF block
      const le = t[0] === 0x49 && t[1] === 0x49; // 'II' = little-endian

      const R16 = (o: number) => le ? t.readUInt16LE(o) : t.readUInt16BE(o);
      const R32 = (o: number) => le ? t.readUInt32LE(o) : t.readUInt32BE(o);

      const ifd0Off = R32(4);
      if (ifd0Off + 2 > t.length) { pos = segEnd; continue; }

      const ifd0Cnt = R16(ifd0Off);
      let exifOff = 0, gpsOff = 0;

      for (let i = 0; i < ifd0Cnt; i++) {
        const e = ifd0Off + 2 + i * 12;
        if (e + 12 > t.length) break;
        const tag = R16(e);
        if (tag === 0x8769) exifOff = R32(e + 8); // ExifIFD
        if (tag === 0x8825) gpsOff  = R32(e + 8); // GPSIFD
      }

      // DateTimeOriginal (0x9003) from ExifIFD
      if (exifOff > 0 && exifOff + 2 <= t.length) {
        const cnt = R16(exifOff);
        for (let i = 0; i < cnt; i++) {
          const e = exifOff + 2 + i * 12;
          if (e + 12 > t.length) break;
          if (R16(e) === 0x9003) {
            const valOff = R32(e + 8);
            if (valOff + 19 <= t.length) {
              result.dateTaken = parseExifDate(t.slice(valOff, valOff + 19).toString('ascii'));
            }
            break;
          }
        }
      }

      // GPS IFD
      if (gpsOff > 0 && gpsOff + 2 <= t.length) {
        const cnt = R16(gpsOff);
        let latRef = 'N', lonRef = 'E';
        let lat: number | null = null, lon: number | null = null;

        for (let i = 0; i < cnt; i++) {
          const e = gpsOff + 2 + i * 12;
          if (e + 12 > t.length) break;
          const tag  = R16(e);
          const type = R16(e + 2);

          // LatRef / LonRef — single ASCII char, stored inline
          if (tag === 0x0001) latRef = String.fromCharCode(t[e + 8]);
          if (tag === 0x0003) lonRef = String.fromCharCode(t[e + 8]);

          // Latitude / Longitude — 3 RATIONALs at valueOffset
          if ((tag === 0x0002 || tag === 0x0004) && type === 5) {
            const vo = R32(e + 8);
            if (vo + 24 <= t.length) {
              const deg = R32(vo)      / (R32(vo + 4)  || 1);
              const min = R32(vo + 8)  / (R32(vo + 12) || 1);
              const sec = R32(vo + 16) / (R32(vo + 20) || 1);
              const val = deg + min / 60 + sec / 3600;
              if (tag === 0x0002) lat = val;
              else                lon = val;
            }
          }
        }

        if (lat !== null) result.latitude  = latRef === 'S' ? -lat : lat;
        if (lon !== null) result.longitude = lonRef === 'W' ? -lon : lon;
      }
    }

    pos = segEnd;
  }

  return result;
}

export function parseExifFromFile(filePath: string): ExifData {
  try {
    const fd  = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(65536);
    const n   = fs.readSync(fd, buf, 0, 65536, 0);
    fs.closeSync(fd);
    return parseExifFromBuffer(buf.slice(0, n));
  } catch {
    return { dateTaken: null, latitude: null, longitude: null };
  }
}

// ─── Reverse Geocoding (Nominatim / OSM) ─────────────────────────────────────

const _geoCache: Record<string, string> = {};
let _lastGeoRequest = 0;

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  if (_geoCache[key]) return _geoCache[key];

  // Respect Nominatim's 1 req/s policy
  const wait = 1000 - (Date.now() - _lastGeoRequest);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  _lastGeoRequest = Date.now();

  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;
    const req = https.get(url, { headers: { 'User-Agent': 'TLAU-Claptrop/1.0 (thelostandunfounds.com)' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const addr = JSON.parse(data).address || {};
          const city = addr.city || addr.town || addr.village || addr.county || 'austin';
          _geoCache[key] = normalizeText(city);
          resolve(_geoCache[key]);
        } catch { resolve('austin'); }
      });
    });
    req.on('error', () => resolve('austin'));
    req.setTimeout(5000, () => { req.destroy(); resolve('austin'); });
  });
}

// ─── Sequence Counter ─────────────────────────────────────────────────────────

const _seqMap: Record<string, number> = {};

export function nextSeq(dateStr: string, location: string, subject: string): string {
  const k = `${dateStr}|${location}|${subject}`;
  _seqMap[k] = (_seqMap[k] || 0) + 1;
  return String(_seqMap[k]).padStart(3, '0');
}

export function resetSeqs() {
  for (const k in _seqMap) delete _seqMap[k];
}

// ─── Generic camera folder names that aren't meaningful subjects ──────────────

const GENERIC_FOLDER = /^(\d{3}[a-z]+|jpg|raf|mov|raw|dcim|photos?|videos?|camera)$/i;

// ─── Name Builder ─────────────────────────────────────────────────────────────

export interface BuildNameOpts {
  originalName: string;   // original filename (with extension)
  filePath?: string;      // local path — used for EXIF reading + mtime fallback
  date?: Date;            // date override (e.g. from Drive metadata)
  lat?: number | null;    // GPS override
  lon?: number | null;    // GPS override
  subject?: string;       // subject override
  parentFolder?: string;  // used if no subject override
  existingNames?: Set<string>; // collision detection (lowercased filenames)
}

export async function buildName(opts: BuildNameOpts): Promise<{ meta: ClaptropMeta; log: RenameLog }> {
  const { originalName, existingNames } = opts;
  const ext = path.extname(originalName).toLowerCase();

  // Subject: explicit override → parent folder (if meaningful) → 'photo'
  const rawSubject = opts.subject || opts.parentFolder || '';
  const subject = (rawSubject && !GENERIC_FOLDER.test(rawSubject))
    ? normalizeText(rawSubject)
    : 'photo';

  // EXIF from local file (JPEG only; RAW/MOV fall through)
  const exif = (opts.filePath && ['.jpg', '.jpeg'].includes(ext))
    ? parseExifFromFile(opts.filePath)
    : { dateTaken: null, latitude: null, longitude: null };

  // Date
  let date: Date;
  let dateSource: RenameLog['date_source'] = 'fallback';

  if (opts.date) {
    date = opts.date;
    dateSource = 'drive';
  } else if (exif.dateTaken) {
    date = exif.dateTaken;
    dateSource = 'EXIF';
  } else if (opts.filePath) {
    date = fs.statSync(opts.filePath).mtime;
    dateSource = 'mtime';
  } else {
    date = new Date();
  }

  const dateStr = date.toISOString().slice(0, 10);

  // Location
  const lat = (opts.lat !== undefined && opts.lat !== null) ? opts.lat : exif.latitude;
  const lon = (opts.lon !== undefined && opts.lon !== null) ? opts.lon : exif.longitude;

  let location: string;
  let locationSource: RenameLog['location_source'] = 'fallback';

  if (lat !== null && lat !== undefined && lon !== null && lon !== undefined) {
    location = await reverseGeocode(lat, lon);
    locationSource = 'GPS';
  } else {
    location = 'austin';
  }

  // Sequence + collision handling
  let seq      = nextSeq(dateStr, location, subject);
  let stem     = `@tlau_${dateStr}_${location}_${subject}_${seq}`;
  let filename = `${stem}${ext}`;

  if (existingNames) {
    while (existingNames.has(filename.toLowerCase())) {
      seq      = nextSeq(dateStr, location, subject);
      stem     = `@tlau_${dateStr}_${location}_${subject}_${seq}`;
      filename = `${stem}${ext}`;
    }
    existingNames.add(filename.toLowerCase());
  }

  return {
    meta: { filename, stem, dateStr, location, subject, seq },
    log:  {
      original: originalName,
      renamed:  filename,
      date_source:     dateSource,
      location_source: locationSource,
      timestamp: new Date().toISOString(),
    },
  };
}

// ─── Disk Space ───────────────────────────────────────────────────────────────

export function getAvailableBytes(dir: string): number {
  try {
    const stat = fs.statfsSync(dir);
    return stat.bavail * stat.bsize;
  } catch {
    return Infinity; // can't check — don't block
  }
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}
