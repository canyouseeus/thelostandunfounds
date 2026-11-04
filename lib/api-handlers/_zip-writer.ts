/**
 * Minimal store-only ZIP writer that streams to a sink as entries are added.
 *
 * Why hand-rolled and store-only: the gallery zips JPEGs, which do not compress,
 * so DEFLATE would burn CPU for nothing. Every entry is written with its real
 * size and CRC in the local header (no data descriptors), because streamed
 * "unknown size" STORE entries are the ones Apple's Archive Utility and some
 * Android unzippers choke on — and iPhones are most of the people downloading.
 * One entry is in memory at a time, so a 300-photo gallery does not need
 * 300 photos of RAM.
 *
 * Limits: no ZIP64. Callers must keep the archive under 4GB and 65,535 entries;
 * addFile throws rather than writing a corrupt archive if either is exceeded.
 */

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
    }
    return table;
})();

export function crc32(buf: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(d: Date): { time: number; date: number } {
    const year = Math.max(d.getFullYear(), 1980);
    return {
        time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
        date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    };
}

const MAX_ENTRIES = 0xfffe;
const MAX_BYTES = 0xfffffffe;

interface CentralEntry {
    name: Buffer;
    crc: number;
    size: number;
    offset: number;
    time: number;
    date: number;
}

export class ZipWriter {
    private offset = 0;
    private entries: CentralEntry[] = [];

    constructor(private readonly write: (chunk: Buffer) => Promise<void>) {}

    get count(): number {
        return this.entries.length;
    }

    /** Bytes written so far, so a caller can stop before the 4GB ceiling. */
    get bytesWritten(): number {
        return this.offset;
    }

    async addFile(name: string, data: Buffer): Promise<void> {
        if (this.entries.length >= MAX_ENTRIES) throw new Error('zip: too many entries');
        // Local header + data + (later) central header + EOCD must all fit in 32 bits.
        if (this.offset + data.length + 46 * (this.entries.length + 1) + 1024 > MAX_BYTES) {
            throw new Error('zip: archive would exceed 4GB');
        }

        const nameBuf = Buffer.from(name, 'utf8');
        const { time, date } = dosDateTime(new Date());
        const crc = crc32(data);

        const header = Buffer.alloc(30);
        header.writeUInt32LE(0x04034b50, 0); // local file header signature
        header.writeUInt16LE(20, 4); // version needed
        header.writeUInt16LE(0x0800, 6); // flags: UTF-8 names
        header.writeUInt16LE(0, 8); // method: store
        header.writeUInt16LE(time, 10);
        header.writeUInt16LE(date, 12);
        header.writeUInt32LE(crc, 14);
        header.writeUInt32LE(data.length, 18); // compressed size
        header.writeUInt32LE(data.length, 22); // uncompressed size
        header.writeUInt16LE(nameBuf.length, 26);
        header.writeUInt16LE(0, 28); // extra length

        const entryOffset = this.offset;
        await this.write(header);
        await this.write(nameBuf);
        await this.write(data);
        this.offset += header.length + nameBuf.length + data.length;
        this.entries.push({ name: nameBuf, crc, size: data.length, offset: entryOffset, time, date });
    }

    /** Writes the central directory and end record. Call exactly once, last. */
    async finish(): Promise<void> {
        const cdStart = this.offset;
        let cdSize = 0;

        for (const e of this.entries) {
            const h = Buffer.alloc(46);
            h.writeUInt32LE(0x02014b50, 0); // central directory signature
            h.writeUInt16LE((3 << 8) | 20, 4); // made by: Unix, v2.0 (so unzip honours the mode below)
            h.writeUInt16LE(20, 6); // version needed
            h.writeUInt16LE(0x0800, 8); // flags: UTF-8 names
            h.writeUInt16LE(0, 10); // method: store
            h.writeUInt16LE(e.time, 12);
            h.writeUInt16LE(e.date, 14);
            h.writeUInt32LE(e.crc, 16);
            h.writeUInt32LE(e.size, 20);
            h.writeUInt32LE(e.size, 24);
            h.writeUInt16LE(e.name.length, 28);
            h.writeUInt16LE(0, 30); // extra length
            h.writeUInt16LE(0, 32); // comment length
            h.writeUInt16LE(0, 34); // disk number start
            h.writeUInt16LE(0, 36); // internal attrs
            h.writeUInt32LE(((0o100644 << 16) >>> 0), 38); // external attrs: -rw-r--r--
            h.writeUInt32LE(e.offset, 42);
            await this.write(h);
            await this.write(e.name);
            cdSize += h.length + e.name.length;
        }

        const end = Buffer.alloc(22);
        end.writeUInt32LE(0x06054b50, 0); // end of central directory signature
        end.writeUInt16LE(0, 4); // this disk
        end.writeUInt16LE(0, 6); // disk with central directory
        end.writeUInt16LE(this.entries.length, 8);
        end.writeUInt16LE(this.entries.length, 10);
        end.writeUInt32LE(cdSize, 12);
        end.writeUInt32LE(cdStart, 16);
        end.writeUInt16LE(0, 20); // comment length
        await this.write(end);
    }
}
