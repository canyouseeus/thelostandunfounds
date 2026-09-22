/**
 * Minimal RFC822/MIME parser for the webmail reader.
 *
 * Zoho's JSON endpoints are unreliable about attachments on this account: the
 * message `content` response carries no attachment metadata at all, and
 * `attachmentinfo` reports no parts for inline (cid:) images. The raw source
 * from `originalmessage` always has both, so the reader pulls files and inline
 * images out of the MIME tree instead of trusting those endpoints.
 *
 * Deliberately small: enough to walk multipart bodies, decode base64 and
 * quoted-printable leaves, and read the handful of headers a mail reader needs.
 */

export interface MimePart {
  /** Stable index into the flattened part list — used as an attachment id. */
  index: number;
  contentType: string;
  /** Filename from Content-Disposition or Content-Type, already decoded. */
  name: string;
  /** Content-ID with the angle brackets stripped, for matching `cid:` refs. */
  contentId: string;
  disposition: string;
  /** Decoded bytes of the part body. */
  content: Buffer;
}

/** Unfold header lines (continuations start with space/tab) into one array. */
function unfold(headerBlock: string): string[] {
  const out: string[] = [];
  for (const line of headerBlock.split(/\r?\n/)) {
    if (/^[ \t]/.test(line) && out.length > 0) {
      out[out.length - 1] += ' ' + line.trim();
    } else if (line.trim()) {
      out.push(line);
    }
  }
  return out;
}

function getHeader(headers: string[], name: string): string {
  const prefix = name.toLowerCase() + ':';
  const hit = headers.find(h => h.toLowerCase().startsWith(prefix));
  return hit ? hit.slice(prefix.length).trim() : '';
}

/** Pull a parameter (charset, boundary, name, filename) out of a header value. */
function getParam(headerValue: string, param: string): string {
  // RFC 2231 extended form first: filename*=utf-8''foo%20bar.png
  const ext = new RegExp(`${param}\\*\\s*=\\s*([^;]+)`, 'i').exec(headerValue);
  if (ext) {
    const raw = ext[1].trim().replace(/^["']|["']$/g, '');
    const parts = raw.split("'");
    const value = parts.length >= 3 ? parts.slice(2).join("'") : raw;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  const plain = new RegExp(`(?:^|;)\\s*${param}\\s*=\\s*("[^"]*"|[^;]+)`, 'i').exec(headerValue);
  if (!plain) return '';
  return decodeRfc2047(plain[1].trim().replace(/^"|"$/g, ''));
}

/** Decode RFC 2047 encoded words (=?utf-8?B?...?=) used in filenames. */
export function decodeRfc2047(value: string): string {
  return value.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_match, charset, encoding, text) => {
    try {
      const enc = String(charset || 'utf-8').toLowerCase();
      const safeEnc: BufferEncoding =
        enc === 'iso-8859-1' || enc === 'latin1' || enc === 'windows-1252' ? 'latin1' : 'utf8';

      if (encoding.toUpperCase() === 'B') {
        return Buffer.from(text, 'base64').toString(safeEnc);
      }
      // Q encoding: underscores are spaces, =XX is a hex byte.
      const bytes = decodeQuotedPrintable(text.replace(/_/g, ' '));
      return bytes.toString(safeEnc);
    } catch {
      return text;
    }
  });
}

function decodeQuotedPrintable(input: string): Buffer {
  // Soft line breaks (= at end of line) join lines back together.
  const joined = input.replace(/=\r?\n/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < joined.length; i++) {
    if (joined[i] === '=' && i + 2 < joined.length && /^[0-9a-f]{2}$/i.test(joined.substr(i + 1, 2))) {
      bytes.push(parseInt(joined.substr(i + 1, 2), 16));
      i += 2;
    } else {
      bytes.push(joined.charCodeAt(i) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

function decodeBody(body: string, encoding: string): Buffer {
  switch (encoding.toLowerCase()) {
    case 'base64':
      return Buffer.from(body.replace(/[^A-Za-z0-9+/=]/g, ''), 'base64');
    case 'quoted-printable':
      return decodeQuotedPrintable(body);
    default:
      return Buffer.from(body, 'binary');
  }
}

/** Split a MIME entity into its raw header block and raw body. */
function splitEntity(raw: string): { headers: string[]; body: string } {
  const match = /\r?\n\r?\n/.exec(raw);
  if (!match) return { headers: unfold(raw), body: '' };
  return {
    headers: unfold(raw.slice(0, match.index)),
    body: raw.slice(match.index + match[0].length)
  };
}

/**
 * Walk a MIME entity and return every leaf part, depth first.
 *
 * Nesting is capped so a malformed or hostile message cannot drive the parser
 * into unbounded recursion.
 */
function walk(raw: string, out: MimePart[], depth: number): void {
  if (depth > 10 || out.length >= 200) return;

  const { headers, body } = splitEntity(raw);
  const contentTypeHeader = getHeader(headers, 'content-type') || 'text/plain';
  const contentType = contentTypeHeader.split(';')[0].trim().toLowerCase();

  if (contentType.startsWith('multipart/')) {
    const boundary = getParam(contentTypeHeader, 'boundary');
    if (!boundary) return;

    // Sections between --boundary markers; the closing --boundary-- ends it.
    const marker = '--' + boundary;
    const segments = body.split(marker);
    for (const segment of segments.slice(1)) {
      if (/^--/.test(segment)) break;
      const child = segment.replace(/^\r?\n/, '');
      if (child.trim()) walk(child, out, depth + 1);
    }
    return;
  }

  const dispositionHeader = getHeader(headers, 'content-disposition');
  const name = getParam(dispositionHeader, 'filename') || getParam(contentTypeHeader, 'name');
  const contentId = getHeader(headers, 'content-id').replace(/^<|>$/g, '').trim();
  const encoding = getHeader(headers, 'content-transfer-encoding') || '7bit';

  out.push({
    index: out.length,
    contentType,
    name,
    contentId,
    disposition: dispositionHeader.split(';')[0].trim().toLowerCase(),
    content: decodeBody(body, encoding)
  });
}

export function parseMimeParts(raw: string): MimePart[] {
  const parts: MimePart[] = [];
  walk(raw, parts, 0);
  return parts;
}

/**
 * A part is a file the reader should offer, rather than the message body:
 * anything explicitly marked as an attachment, anything named that is not
 * referenced inline, and inline parts that carry a filename.
 */
export function isAttachmentPart(part: MimePart): boolean {
  if (part.disposition === 'attachment') return true;
  if (!part.name) return false;
  // A named inline image with a cid is rendered in the body, but recipients
  // still expect it in the attachment strip, so it counts either way.
  return true;
}

/** Inline images referenced from the body by `cid:`. */
export function isInlineImagePart(part: MimePart): boolean {
  return Boolean(part.contentId) && part.contentType.startsWith('image/');
}
