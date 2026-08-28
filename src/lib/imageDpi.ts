/**
 * Write physical resolution into an encoded image.
 *
 * A canvas knows only pixels. `canvas.toBlob()` emits a PNG with no pHYs chunk
 * and a JPEG whose JFIF density is 1x1 "no units", so every export lands in a
 * print RIP as 72 DPI regardless of how many pixels it contains. The pixels are
 * right and the file still prints at the wrong size — the operator has to
 * retype the dimensions, which is exactly the manual step this is meant to
 * remove.
 *
 * So the resize writes the density in afterwards, patching the container
 * directly. Both functions are pure byte surgery on an already-encoded blob:
 * no re-encode, no quality loss, no dependency.
 */

/** Inches to metres — the PNG spec stores pixels per metre, integer only. */
const METRES_PER_INCH = 0.0254;

const CRC_TABLE: Uint32Array = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(bytes: Uint8Array): number {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function isPng(bytes: Uint8Array): boolean {
    return PNG_SIGNATURE.every((b, i) => bytes[i] === b);
}

function readU32(bytes: Uint8Array, at: number): number {
    return ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;
}

function chunkType(bytes: Uint8Array, at: number): string {
    return String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
}

/** A complete pHYs chunk: length, type, ppu-x, ppu-y, unit=metre, CRC. */
function buildPhysChunk(dpi: number): Uint8Array {
    const ppu = Math.round(dpi / METRES_PER_INCH);
    const chunk = new Uint8Array(21);
    const view = new DataView(chunk.buffer);
    view.setUint32(0, 9);                       // data length
    chunk.set([0x70, 0x48, 0x59, 0x73], 4);     // 'pHYs'
    view.setUint32(8, ppu);                     // pixels per metre, x
    view.setUint32(12, ppu);                    // pixels per metre, y
    chunk[16] = 1;                              // unit specifier: metre
    view.setUint32(17, crc32(chunk.subarray(4, 17)));
    return chunk;
}

/**
 * Return a copy of `blob` carrying `dpi` in its pHYs chunk.
 *
 * pHYs must precede IDAT, so it goes directly after IHDR. Any pHYs already
 * present is dropped rather than edited — replacing it wholesale avoids
 * assuming anything about a chunk another encoder wrote.
 */
export async function withPngDpi(blob: Blob, dpi: number): Promise<Blob> {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (!isPng(bytes)) return blob;

    const parts: Uint8Array[] = [bytes.subarray(0, 8)];
    let offset = 8;
    let inserted = false;

    while (offset + 8 <= bytes.length) {
        const dataLength = readU32(bytes, offset);
        const type = chunkType(bytes, offset + 4);
        const total = 12 + dataLength;
        if (offset + total > bytes.length) break;   // truncated file; emit what we have

        if (type !== 'pHYs') parts.push(bytes.subarray(offset, offset + total));

        if (type === 'IHDR' && !inserted) {
            parts.push(buildPhysChunk(dpi));
            inserted = true;
        }
        offset += total;
    }

    if (!inserted) return blob;                     // no IHDR: not a PNG we understand
    return new Blob(parts as BlobPart[], { type: 'image/png' });
}

/**
 * Return a copy of `blob` whose JFIF APP0 density reads `dpi`.
 *
 * Browsers emit a JFIF APP0 for canvas JPEGs, so the common path patches three
 * fields in place. When the marker is absent one is inserted after SOI, which
 * is where the spec requires it.
 */
export async function withJpegDpi(blob: Blob, dpi: number): Promise<Blob> {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return blob;    // not SOI
    const density = Math.round(dpi);

    let offset = 2;
    while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
        const marker = bytes[offset + 1];
        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
            offset += 2;
            continue;
        }
        if (marker === 0xda) break;                              // start of scan: no headers past here
        const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];

        const isJfif =
            marker === 0xe0 &&
            bytes[offset + 4] === 0x4a && bytes[offset + 5] === 0x46 &&
            bytes[offset + 6] === 0x49 && bytes[offset + 7] === 0x46 &&
            bytes[offset + 8] === 0x00;

        if (isJfif) {
            const out = bytes.slice();
            out[offset + 11] = 1;                                // units: dots per inch
            out[offset + 12] = (density >> 8) & 0xff;            // Xdensity
            out[offset + 13] = density & 0xff;
            out[offset + 14] = (density >> 8) & 0xff;            // Ydensity
            out[offset + 15] = density & 0xff;
            return new Blob([out as BlobPart], { type: 'image/jpeg' });
        }
        offset += 2 + segmentLength;
    }

    // No JFIF APP0 — build the canonical 18-byte segment and splice it after SOI.
    const app0 = new Uint8Array([
        0xff, 0xe0, 0x00, 0x10,
        0x4a, 0x46, 0x49, 0x46, 0x00,                            // 'JFIF\0'
        0x01, 0x02,                                              // version 1.02
        0x01,                                                    // units: dpi
        (density >> 8) & 0xff, density & 0xff,
        (density >> 8) & 0xff, density & 0xff,
        0x00, 0x00,                                              // no embedded thumbnail
    ]);
    return new Blob(
        [bytes.subarray(0, 2) as BlobPart, app0 as BlobPart, bytes.subarray(2) as BlobPart],
        { type: 'image/jpeg' },
    );
}

/** Apply the density appropriate to the blob's own container. */
export async function withDpi(blob: Blob, dpi: number): Promise<Blob> {
    if (blob.type === 'image/png') return withPngDpi(blob, dpi);
    if (blob.type === 'image/jpeg') return withJpegDpi(blob, dpi);
    return blob;
}
