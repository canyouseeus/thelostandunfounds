/**
 * Drives the camera relay with a real FTP client (curl) against a stub of the
 * site's ingest routes, and checks what reaches the stub.
 *
 *   node relay/ftp/verify-relay.mjs
 *
 * Every check reads what the stub actually received, so a relay that answers
 * 226 without forwarding the photo fails here.
 */

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import tls from 'node:tls';
import { execFileSync, spawn } from 'node:child_process';
import { createRelay, createSite, keyFromPassword, baseName } from './server.mjs';

const KEY_SUFFIX = 'abcd1234efgh5678ijkl9012';
const VALID_KEY = `tlu_live_${KEY_SUFFIX}`;
let failures = 0;
let checks = 0;

function check(name, ok, detail = '') {
    checks++;
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `\n      ${detail}` : ''}`);
}

// --- Stub site ---------------------------------------------------------------
const received = { info: [], start: [], put: [], complete: [] };
let failCompleteOnce = false;
let revoked = false;

const stub = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
        const body = Buffer.concat(chunks);
        const auth = req.headers.authorization || '';
        const json = (status, obj) => {
            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(obj));
        };
        if (req.method === 'PUT' && req.url.startsWith('/drive-session/')) {
            const id = `drivefile${crypto.randomBytes(6).toString('hex')}`;
            received.put.push({ url: req.url, bytes: body, id });
            return json(200, { id });
        }
        const keyOk = auth === `Bearer ${VALID_KEY}` && !revoked;
        if (!keyOk) return json(401, { error: 'This upload key is not valid.' });
        const payload = JSON.parse(body.toString() || '{}');
        if (req.url === '/api/gallery/ingest-info') {
            received.info.push(payload);
            return json(200, { success: true, gallery: 'test-event', name: 'Test Event', live: true });
        }
        if (req.url === '/api/gallery/ingest-start') {
            received.start.push(payload);
            return json(200, { success: true, uploadUrl: `http://127.0.0.1:${stub.address().port}/drive-session/${received.start.length}` });
        }
        if (req.url === '/api/gallery/ingest-complete') {
            if (failCompleteOnce) {
                failCompleteOnce = false;
                return json(503, { error: 'try again' });
            }
            received.complete.push(payload);
            return json(200, { success: true, pending: true });
        }
        json(404, { error: 'no route' });
    });
});
await new Promise(r => stub.listen(0, '127.0.0.1', r));

// --- Relay ---------------------------------------------------------------------
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'relay-verify-'));
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=127.0.0.1',
    '-keyout', path.join(work, 'key.pem'), '-out', path.join(work, 'cert.pem')], { stdio: 'ignore' });
const secureContext = tls.createSecureContext({
    cert: fs.readFileSync(path.join(work, 'cert.pem')),
    key: fs.readFileSync(path.join(work, 'key.pem')),
});

const relay = createRelay({
    site: createSite(`http://127.0.0.1:${stub.address().port}`),
    pasvHost: '127.0.0.1',
    pasvPortMin: 40100,
    pasvPortMax: 40109,
    spoolDir: path.join(work, 'spool'),
    secureContext,
});
await new Promise(r => relay.listen(0, '127.0.0.1', r));
const ftp = `ftp://127.0.0.1:${relay.address().port}`;

// Async on purpose: the stub and the relay live in this process, so a
// blocking spawn would starve them and curl would wait forever.
function curl(args) {
    return new Promise(resolve => {
        const child = spawn('curl', ['-sS', '--max-time', '30', ...args]);
        let stderr = '';
        child.stderr.on('data', c => { stderr += c; });
        child.on('close', status => resolve({ status, stderr }));
    });
}
function photo(name, bytes) {
    const file = path.join(work, name);
    fs.writeFileSync(file, bytes);
    return file;
}

// --- Checks ----------------------------------------------------------------------
check('keyFromPassword adds the prefix to a typed suffix', keyFromPassword(` ${KEY_SUFFIX} `) === VALID_KEY);
check('keyFromPassword keeps a full key as-is', keyFromPassword(VALID_KEY) === VALID_KEY);
check('baseName drops camera folders', baseName('/DCIM/100EOSR5/IMG_0001.JPG') === 'IMG_0001.JPG');

// 1. A JPEG with the typed suffix as password, into a camera folder tree.
const jpegBytes = crypto.randomBytes(3 * 1024 * 1024 + 17);
let r = await curl(['--ftp-pasv', '--ftp-create-dirs', '-u', `eric:${KEY_SUFFIX}`,
    '-T', photo('IMG_0001.JPG', jpegBytes), `${ftp}/DCIM/100EOSR5/IMG_0001.JPG`]);
check('JPEG upload succeeds for the camera', r.status === 0, r.stderr);
check('ingest-start got name, type and size',
    received.start[0]?.fileName === 'IMG_0001.JPG' && received.start[0]?.mimeType === 'image/jpeg'
    && received.start[0]?.size === jpegBytes.length, JSON.stringify(received.start[0]));
check('Drive session got the exact bytes', received.put[0] && received.put[0].bytes.equals(jpegBytes));
check('ingest-complete got that file id and no publish flag',
    received.complete[0]?.fileId === received.put[0]?.id && !('publish' in (received.complete[0] || {})),
    JSON.stringify(received.complete[0]));

// 2. Wrong password is refused and nothing is forwarded.
const before = received.start.length;
r = await curl(['--ftp-pasv', '-u', 'eric:wrongwrongwrong', '-T', photo('IMG_0002.JPG', Buffer.from('x')), `${ftp}/IMG_0002.JPG`]);
check('wrong password is refused', r.status !== 0 && /530|denied|Login/i.test(r.stderr), r.stderr);
check('nothing forwarded for a refused login', received.start.length === before);

// 3. A raw file is accepted (so the camera moves on) but not forwarded.
r = await curl(['--ftp-pasv', '-u', `eric:${KEY_SUFFIX}`, '-T', photo('IMG_0003.CR3', crypto.randomBytes(2048)), `${ftp}/IMG_0003.CR3`]);
check('CR3 is acknowledged to the camera', r.status === 0, r.stderr);
check('CR3 is not forwarded', received.start.length === before);

// 4. A transient site failure is retried and the photo still lands.
failCompleteOnce = true;
const jpeg2 = crypto.randomBytes(50_000);
r = await curl(['--ftp-pasv', '-u', `eric:${VALID_KEY}`, '-T', photo('IMG_0004.jpg', jpeg2), `${ftp}/IMG_0004.jpg`]);
check('upload survives one 503 from ingest-complete', r.status === 0, r.stderr);
check('the retried photo was recorded', received.complete.some(c => received.put.find(p => p.id === c.fileId)?.bytes.equals(jpeg2)));
check('the retry did not upload the photo twice', received.put.filter(p => p.bytes.equals(jpeg2)).length === 1,
    `${received.put.filter(p => p.bytes.equals(jpeg2)).length} copies sent to Drive`);

// 5. Explicit FTPS with a protected data channel.
const jpeg3 = crypto.randomBytes(400_000);
r = await curl(['--ftp-pasv', '--ssl-reqd', '--insecure', '-u', `eric:${KEY_SUFFIX}`,
    '-T', photo('IMG_0005.jpg', jpeg3), `${ftp}/IMG_0005.jpg`]);
check('FTPS upload succeeds', r.status === 0, r.stderr);
check('FTPS bytes arrive intact', received.put.some(p => p.bytes.equals(jpeg3)));

// 6. A key turned off mid-event: the camera is told the send failed (so it is
//    not marked sent), not 226.
revoked = true;
r = await curl(['--ftp-pasv', '-u', `eric:${KEY_SUFFIX}`, '-T', photo('IMG_0006.jpg', crypto.randomBytes(1000)), `${ftp}/IMG_0006.jpg`]);
check('revoked key fails the upload', r.status !== 0, `exit ${r.status} ${r.stderr}`);

// 7. Active mode is refused rather than silently hanging.
revoked = false;
r = await curl(['--ftp-port', '-', '-u', `eric:${KEY_SUFFIX}`, '-T', photo('IMG_0007.jpg', Buffer.from('y')), `${ftp}/IMG_0007.jpg`]);
check('active mode is refused', r.status !== 0, r.stderr);

console.log(`\n${checks - failures}/${checks} checks passed`);
relay.close();
stub.close();
fs.rmSync(work, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
