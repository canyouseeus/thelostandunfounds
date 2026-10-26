/**
 * Camera FTP relay — a camera sends each shot here over FTP, and this hands it
 * to the site's live ingest routes. No dependencies; Node 20+.
 *
 * Why it exists: a Canon set to transfer straight from the body (R5, R6 II,
 * R3, R1, or a 5D IV with its wireless transmitter) speaks FTP, and Vercel
 * cannot host an FTP server. This is the small always-on piece in between.
 *
 * The password IS the upload key. A camera login minted on /admin/live is a
 * tlu_live_ key whose random part is short and lowercase so it can be typed on
 * a camera; the photographer types that part as the FTP password (the full
 * key works too). The login name is ignored. So the relay holds no secrets,
 * no database and no list of users: it checks each login against
 * /api/gallery/ingest-info, and a key turned off on /admin/live stops working
 * here on the next login.
 *
 * Each photo: the camera STORs it, it is spooled to disk, then
 *   ingest-start → PUT the bytes to the Drive session → ingest-complete
 * without `publish`, so it lands in the gallery's private review inbox — a
 * camera sends every frame, misfires included. The camera is told 226 only
 * once ingest-complete succeeds; on failure it gets 451 and the camera's own
 * retry sends it again, so a photo is never acknowledged and then lost.
 *
 * Only JPEG, HEIC and PNG are forwarded. Anything else (CR3 raws, movies,
 * voice memos) is accepted and dropped, so the camera does not retry it
 * forever; set the camera to send JPEG.
 *
 * Passive mode only — a camera behind a phone hotspot cannot be dialled back.
 * Explicit FTPS (AUTH TLS) is offered when TLS_CERT_FILE and TLS_KEY_FILE are
 * set.
 *
 * Env:
 *   PASV_HOST        public IPv4 (or a name resolving to it) handed to PASV. Required.
 *   FTP_PORT         control port, default 21
 *   PASV_PORT_MIN    passive range, default 30000
 *   PASV_PORT_MAX    default 30009
 *   SITE_URL         default https://www.thelostandunfounds.com
 *   SPOOL_DIR        default <os tmpdir>/tlu-ftp-relay
 *   TLS_CERT_FILE / TLS_KEY_FILE   optional, enables AUTH TLS
 */

import net from 'node:net';
import tls from 'node:tls';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import dns from 'node:dns/promises';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const KEY_PREFIX = 'tlu_live_';
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // same cap as ingest-start
const IDLE_MS = 10 * 60 * 1000;
const DATA_WAIT_MS = 30 * 1000;
const LOGIN_CACHE_MS = 60 * 1000;
const MAX_FAILED_LOGINS = 5;
const FAILED_LOGIN_WINDOW_MS = 10 * 60 * 1000;

const MIME_BY_EXT = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    '.png': 'image/png',
};

function log(...args) {
    console.log(new Date().toISOString(), ...args);
}

/** What the camera types (the key's random part, or the whole key) → the key. */
export function keyFromPassword(password) {
    const value = String(password || '').trim();
    if (!value) return '';
    return value.startsWith(KEY_PREFIX) ? value : KEY_PREFIX + value;
}

/** Strip any directory the camera puts in front, and anything a filename can't hold. */
export function baseName(arg) {
    const name = String(arg || '').split(/[\\/]/).pop() || '';
    return name.replace(/[^\w.\- ]/g, '_').slice(-120);
}

export function mimeFor(fileName) {
    return MIME_BY_EXT[path.extname(fileName).toLowerCase()] || null;
}

class ForwardError extends Error {
    constructor(message, { retry = false, auth = false } = {}) {
        super(message);
        this.retry = retry;
        this.auth = auth;
    }
}

/**
 * Talks to the site. Kept apart from the FTP code so tests can point it at a
 * stub, and so every network rule lives in one place.
 */
export function createSite(siteUrl, fetchImpl = fetch) {
    const base = siteUrl.replace(/\/+$/, '');

    async function post(route, key, body) {
        let res;
        try {
            res = await fetchImpl(`${base}/api/gallery/${route}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(30000),
            });
        } catch (err) {
            throw new ForwardError(`${route}: ${err.message}`, { retry: true });
        }
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new ForwardError(`${route} ${res.status}: ${json.error || 'no detail'}`, {
                retry: res.status >= 500 || res.status === 429,
                auth: res.status === 401,
            });
        }
        return json;
    }

    return {
        /** The gallery a key uploads to, or null when the key is not valid. */
        async describe(key) {
            try {
                return await post('ingest-info', key, {});
            } catch (err) {
                if (err.auth) return null;
                throw err;
            }
        },

        /**
         * Send one spooled photo to the gallery's inbox. Returns the Drive file id.
         *
         * Each step retries on its own. Retrying the whole thing after a failed
         * ingest-complete would upload the photo a second time and leave the
         * first copy in the inbox folder with no record pointing at it;
         * ingest-complete on the same file id twice is a no-op, so it is the
         * step that is safe to repeat.
         */
        async forward(key, filePath, fileName, mimeType) {
            const fileId = await withRetries(() => this.upload(key, filePath, fileName, mimeType));
            await withRetries(() => post('ingest-complete', key, { fileId }));
            return fileId;
        },

        /** ingest-start and the PUT to Drive — a failed PUT leaves no file, so these retry together. */
        async upload(key, filePath, fileName, mimeType) {
            const { size } = await fsp.stat(filePath);
            const { uploadUrl } = await post('ingest-start', key, { fileName, mimeType, size });
            if (!uploadUrl) throw new ForwardError('ingest-start returned no upload URL', { retry: true });

            let res;
            try {
                res = await fetchImpl(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': mimeType, 'Content-Length': String(size) },
                    body: Readable.toWeb(fs.createReadStream(filePath)),
                    duplex: 'half',
                    signal: AbortSignal.timeout(5 * 60 * 1000),
                });
            } catch (err) {
                throw new ForwardError(`upload: ${err.message}`, { retry: true });
            }
            const uploaded = await res.json().catch(() => ({}));
            if (!res.ok || !uploaded.id) {
                throw new ForwardError(`upload ${res.status}: Drive returned no file id`, { retry: res.status >= 500 });
            }
            return uploaded.id;
        },
    };
}

async function withRetries(fn, attempts = 3) {
    for (let attempt = 1; ; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (!(err instanceof ForwardError) || !err.retry || attempt >= attempts) throw err;
            await new Promise(r => setTimeout(r, 1000 * 2 ** (attempt - 1)));
        }
    }
}

/**
 * Splits a socket's bytes into CRLF lines. Re-attached to the TLS socket after
 * AUTH TLS, since the plain socket's bytes are then ciphertext.
 */
function onLines(socket, handler) {
    let buffer = '';
    const onData = chunk => {
        buffer += chunk.toString('utf8');
        if (buffer.length > 8192) {
            socket.destroy();
            return;
        }
        let index;
        while ((index = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, index).replace(/\r$/, '');
            buffer = buffer.slice(index + 1);
            handler(line);
        }
    };
    socket.on('data', onData);
    return () => socket.off('data', onData);
}

export function createRelay(options) {
    const {
        site,
        pasvHost,
        pasvPortMin = 30000,
        pasvPortMax = 30009,
        spoolDir = path.join(os.tmpdir(), 'tlu-ftp-relay'),
        secureContext = null,
    } = options;

    fs.mkdirSync(spoolDir, { recursive: true });

    const validKeys = new Map(); // key → { gallery, at }
    const failedLogins = new Map(); // ip → [timestamps]
    const usedPorts = new Set();

    function tooManyFailures(ip) {
        const now = Date.now();
        const recent = (failedLogins.get(ip) || []).filter(t => now - t < FAILED_LOGIN_WINDOW_MS);
        failedLogins.set(ip, recent);
        return recent.length >= MAX_FAILED_LOGINS;
    }

    async function checkKey(key) {
        const cached = validKeys.get(key);
        if (cached && Date.now() - cached.at < LOGIN_CACHE_MS) return cached.gallery;
        const info = await site.describe(key);
        if (!info) {
            validKeys.delete(key);
            return null;
        }
        validKeys.set(key, { gallery: info, at: Date.now() });
        return info;
    }

    /** Listen on a free port in the passive range, for one data connection from `ip`. */
    function openPassive(ip) {
        return new Promise((resolve, reject) => {
            const ports = [];
            for (let p = pasvPortMin; p <= pasvPortMax; p++) if (!usedPorts.has(p)) ports.push(p);
            if (ports.length === 0) return reject(new Error('No passive port free.'));
            const port = ports[crypto.randomInt(ports.length)];
            usedPorts.add(port);

            let accepted = null;
            let waiters = [];
            const server = net.createServer(socket => {
                // Only the client that asked may connect, and only once —
                // otherwise someone could race the camera to the port.
                if (accepted || normalizeIp(socket.remoteAddress) !== ip) {
                    socket.destroy();
                    return;
                }
                accepted = socket;
                server.close();
                waiters.forEach(w => w(socket));
                waiters = [];
            });
            const release = () => usedPorts.delete(port);
            server.on('close', release);
            server.on('error', err => {
                release();
                reject(err);
            });
            server.listen(port, '0.0.0.0', () => {
                resolve({
                    port,
                    connection: () => new Promise((res, rej) => {
                        if (accepted) return res(accepted);
                        const timer = setTimeout(() => rej(new Error('Data connection timed out.')), DATA_WAIT_MS);
                        waiters.push(s => {
                            clearTimeout(timer);
                            res(s);
                        });
                    }),
                    close: () => {
                        server.close();
                        accepted?.destroy();
                    },
                });
            });
        });
    }

    function handleClient(socket) {
        const ip = normalizeIp(socket.remoteAddress);
        let control = socket;
        let stopLines = null;
        let user = '';
        let key = '';
        let gallery = null;
        let cwd = '/';
        let passive = null;
        let protectData = false;
        let busy = Promise.resolve();

        const reply = (code, text) => {
            if (!control.destroyed) control.write(`${code} ${text}\r\n`);
        };
        const closePassive = () => {
            passive?.close();
            passive = null;
        };

        socket.setTimeout(IDLE_MS, () => {
            reply(421, 'Idle too long, closing.');
            socket.destroy();
        });
        socket.on('error', () => {});
        socket.on('close', closePassive);

        async function dataSocket() {
            if (!passive) throw new Error('Use PASV or EPSV first.');
            const current = passive;
            passive = null;
            let data = await current.connection();
            if (protectData && secureContext) {
                const secure = new tls.TLSSocket(data, { isServer: true, secureContext });
                await new Promise((resolve, reject) => {
                    secure.once('secure', resolve);
                    secure.once('error', reject);
                });
                data = secure;
            }
            data.on('error', () => {});
            return { socket: data, close: () => current.close() };
        }

        async function sendListing() {
            const data = await dataSocket();
            reply(150, 'Here comes the listing.');
            data.socket.end('');
            await new Promise(r => data.socket.once('close', r));
            data.close();
            reply(226, 'Listing done.');
        }

        async function store(arg) {
            const fileName = baseName(arg);
            if (!fileName) return reply(501, 'File name required.');
            const data = await dataSocket();
            reply(150, `Receiving ${fileName}.`);

            const spoolPath = path.join(spoolDir, `${crypto.randomUUID()}${path.extname(fileName)}`);
            let size = 0;
            let tooBig = false;
            data.socket.on('data', chunk => {
                size += chunk.length;
                if (size > MAX_UPLOAD_BYTES && !tooBig) {
                    tooBig = true;
                    data.socket.destroy();
                }
            });
            try {
                await pipeline(data.socket, fs.createWriteStream(spoolPath));
            } catch {
                if (!tooBig) {
                    await fsp.rm(spoolPath, { force: true });
                    data.close();
                    return reply(426, 'Connection closed; transfer aborted.');
                }
            }
            data.close();

            try {
                if (tooBig) return reply(552, 'That file is larger than 200MB.');
                const mimeType = mimeFor(fileName);
                if (!mimeType) {
                    log(`[${gallery.gallery}] skipped ${fileName}: not a JPEG, HEIC or PNG`);
                    return reply(226, 'Received; only JPEG, HEIC and PNG go to the gallery.');
                }
                if (size === 0) return reply(226, 'Received an empty file; nothing sent.');
                const started = Date.now();
                const fileId = await site.forward(key, spoolPath, fileName, mimeType);
                log(`[${gallery.gallery}] ${user || 'camera'} → ${fileName} (${size} bytes, ${Date.now() - started}ms) ${fileId}`);
                reply(226, 'Sent to the gallery inbox.');
            } catch (err) {
                log(`[${gallery?.gallery}] FAILED ${fileName}: ${err.message}`);
                if (err.auth) {
                    validKeys.delete(key);
                    reply(451, 'This camera login has been turned off.');
                } else {
                    reply(451, 'Could not reach the gallery; send it again.');
                }
            } finally {
                await fsp.rm(spoolPath, { force: true });
            }
        }

        function upgradeToTls() {
            stopLines?.();
            const secure = new tls.TLSSocket(socket, { isServer: true, secureContext });
            secure.on('error', () => socket.destroy());
            control = secure;
            stopLines = onLines(secure, line => { busy = busy.then(() => command(line)); });
        }

        async function command(line) {
            const space = line.indexOf(' ');
            const verb = (space < 0 ? line : line.slice(0, space)).toUpperCase();
            const arg = space < 0 ? '' : line.slice(space + 1);

            const open = ['USER', 'PASS', 'QUIT', 'NOOP', 'FEAT', 'SYST', 'AUTH', 'PBSZ', 'PROT', 'OPTS', 'HELP'];
            if (!gallery && !open.includes(verb)) return reply(530, 'Log in first.');

            try {
                switch (verb) {
                    case 'USER':
                        user = arg.trim().slice(0, 64);
                        gallery = null;
                        return reply(331, 'Password please.');
                    case 'PASS': {
                        if (tooManyFailures(ip)) return reply(421, 'Too many failed logins. Try again later.');
                        const candidate = keyFromPassword(arg);
                        const info = candidate ? await checkKey(candidate) : null;
                        if (!info) {
                            failedLogins.get(ip).push(Date.now());
                            log(`login refused from ${ip} (${user || 'no name'})`);
                            return reply(530, 'Login incorrect.');
                        }
                        key = candidate;
                        gallery = info;
                        log(`login ${user || 'camera'} from ${ip} → ${info.gallery}`);
                        return reply(230, `Logged in. Photos go to ${info.name}.`);
                    }
                    case 'AUTH':
                        if (!secureContext || !/^(TLS|SSL)$/i.test(arg.trim())) return reply(504, 'TLS is not available.');
                        reply(234, 'Starting TLS.');
                        return upgradeToTls();
                    case 'PBSZ':
                        return reply(200, 'PBSZ=0');
                    case 'PROT':
                        if (/^P$/i.test(arg.trim()) && secureContext && control !== socket) {
                            protectData = true;
                            return reply(200, 'Data channel protected.');
                        }
                        if (/^C$/i.test(arg.trim())) {
                            protectData = false;
                            return reply(200, 'Data channel clear.');
                        }
                        return reply(536, 'Protection level not supported.');
                    case 'SYST':
                        return reply(215, 'UNIX Type: L8');
                    case 'FEAT':
                        control.write('211-Features:\r\n PASV\r\n EPSV\r\n UTF8\r\n'
                            + (secureContext ? ' AUTH TLS\r\n PBSZ\r\n PROT\r\n' : '') + '211 End\r\n');
                        return;
                    case 'OPTS':
                        return reply(200, 'OK');
                    case 'NOOP':
                        return reply(200, 'OK');
                    case 'HELP':
                        return reply(214, 'Send photos with STOR.');
                    case 'QUIT':
                        reply(221, 'Bye.');
                        return control.end();
                    // The camera sees an empty folder tree it can walk and build
                    // freely. Nothing is stored here, so there is nothing to show.
                    case 'PWD':
                    case 'XPWD':
                        return reply(257, `"${cwd}" is the current directory.`);
                    case 'CWD':
                    case 'XCWD':
                        cwd = path.posix.resolve(cwd, arg || '/');
                        return reply(250, 'OK');
                    case 'CDUP':
                    case 'XCUP':
                        cwd = path.posix.dirname(cwd);
                        return reply(250, 'OK');
                    case 'MKD':
                    case 'XMKD':
                        return reply(257, `"${path.posix.resolve(cwd, arg)}" created.`);
                    case 'RMD':
                    case 'XRMD':
                    case 'DELE':
                        return reply(250, 'OK');
                    case 'RNFR':
                        return reply(350, 'Ready.');
                    case 'RNTO':
                        return reply(250, 'OK');
                    case 'TYPE':
                    case 'MODE':
                    case 'STRU':
                    case 'ALLO':
                        return reply(200, 'OK');
                    case 'SIZE':
                    case 'MDTM':
                        return reply(550, 'No such file.');
                    case 'REST':
                        return reply(502, 'Resume is not supported; send the whole file.');
                    case 'PORT':
                    case 'EPRT':
                        return reply(502, 'Active mode is not supported; turn on passive mode.');
                    case 'PASV':
                    case 'EPSV': {
                        closePassive();
                        passive = await openPassive(ip);
                        if (verb === 'EPSV') return reply(229, `Entering extended passive mode (|||${passive.port}|).`);
                        const octets = pasvHost.split('.').join(',');
                        return reply(227, `Entering passive mode (${octets},${passive.port >> 8},${passive.port & 255}).`);
                    }
                    case 'LIST':
                    case 'NLST':
                    case 'MLSD':
                        return await sendListing();
                    case 'STOR':
                    case 'APPE':
                    case 'STOU':
                        return await store(verb === 'STOU' ? `${crypto.randomUUID()}.jpg` : arg);
                    case 'ABOR':
                        closePassive();
                        return reply(226, 'Aborted.');
                    default:
                        return reply(502, 'Command not implemented.');
                }
            } catch (err) {
                log(`error on ${verb} from ${ip}: ${err.message}`);
                closePassive();
                return reply(425, err.message);
            }
        }

        stopLines = onLines(socket, line => { busy = busy.then(() => command(line)); });
        reply(220, 'THE LOST+UNFOUNDS camera relay.');
    }

    return net.createServer(handleClient);
}

function normalizeIp(address) {
    return String(address || '').replace(/^::ffff:/, '');
}

async function main() {
    const pasvHostSetting = process.env.PASV_HOST;
    if (!pasvHostSetting) {
        console.error('PASV_HOST is required: the public IPv4 address cameras connect to.');
        process.exit(1);
    }
    const pasvHost = net.isIPv4(pasvHostSetting)
        ? pasvHostSetting
        : (await dns.lookup(pasvHostSetting, { family: 4 })).address;

    let secureContext = null;
    if (process.env.TLS_CERT_FILE && process.env.TLS_KEY_FILE) {
        secureContext = tls.createSecureContext({
            cert: fs.readFileSync(process.env.TLS_CERT_FILE),
            key: fs.readFileSync(process.env.TLS_KEY_FILE),
        });
    }

    const siteUrl = process.env.SITE_URL || 'https://www.thelostandunfounds.com';
    const server = createRelay({
        site: createSite(siteUrl),
        pasvHost,
        pasvPortMin: Number(process.env.PASV_PORT_MIN || 30000),
        pasvPortMax: Number(process.env.PASV_PORT_MAX || 30009),
        spoolDir: process.env.SPOOL_DIR || undefined,
        secureContext,
    });
    const port = Number(process.env.FTP_PORT || 21);
    server.listen(port, '0.0.0.0', () => {
        log(`camera relay on :${port}, passive ${pasvHost}, forwarding to ${siteUrl}${secureContext ? ', FTPS on' : ''}`);
    });
}

if (import.meta.url === `file://${process.argv[1]}`) main();
