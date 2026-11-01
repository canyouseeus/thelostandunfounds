/**
 * Harness for sendToGalleryResilient (src/components/live/sendToGallery.ts):
 * an upload interrupted by switching apps on a phone must retry when the page
 * is back on screen, never retry a refusal, and never retry while hidden.
 * Run: npx tsx scripts/verify-upload-resume.mts
 */
import { sendToGalleryResilient, UploadRefused } from '../src/components/live/sendToGallery.ts';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
    if (!ok) failures++;
};

// --- fake page visibility ---------------------------------------------------
let visibility: 'visible' | 'hidden' = 'visible';
const listeners = new Set<() => void>();
(globalThis as any).document = {
    get visibilityState() { return visibility; },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
};
const setVisible = (v: 'visible' | 'hidden') => { visibility = v; listeners.forEach(fn => fn()); };

// --- fake network -----------------------------------------------------------
// ingest-start / ingest-complete answer from `plan`; the Drive PUT is an XHR.
let plan: Array<'ok' | 'net' | 'refuse'> = [];
const calls: string[] = [];
(globalThis as any).fetch = async (url: string) => {
    const route = String(url).split('/').pop()!;
    calls.push(route);
    if (route === 'ingest-start') {
        const step = plan.shift() ?? 'ok';
        if (step === 'net') throw new TypeError('Load failed');
        if (step === 'refuse') return new Response(JSON.stringify({ error: 'That video is over 1GB.' }), { status: 413 });
        return new Response(JSON.stringify({ uploadUrl: 'https://www.googleapis.com/upload/drive/v3/files?upload_id=x' }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
};
let xhrMode: 'ok' | 'stall' = 'ok';
(globalThis as any).XMLHttpRequest = class {
    status = 0; responseText = ''; upload: any = {};
    onload: any; onerror: any; onabort: any; onloadend: any;
    open() {}
    abort() { this.onabort?.(); this.onloadend?.(); }
    send() {
        if (xhrMode === 'stall') return; // never progresses
        setTimeout(() => { this.status = 200; this.responseText = '{"id":"drive-file-1"}'; this.onload?.(); this.onloadend?.(); }, 5);
    }
};
const file = { name: 'DSCF3208.jpeg', type: 'image/jpeg', size: 10_000_000, slice: () => new Blob() } as unknown as File;
const opts = () => ({ file, slug: 'mikey-a', relay: { only: false } });

// 1. A dropped connection retries and succeeds.
plan = ['net', 'ok']; calls.length = 0;
await sendToGalleryResilient(opts());
check('a dropped upload retries and finishes', calls.filter(c => c === 'ingest-start').length === 2 && calls.includes('ingest-complete'), calls.join(','));

// 2. A refusal from our API is final.
plan = ['refuse']; calls.length = 0;
try { await sendToGalleryResilient(opts()); check('a refusal is not retried', false, 'it succeeded'); }
catch (err) { check('a refusal is not retried', err instanceof UploadRefused && calls.filter(c => c === 'ingest-start').length === 1, calls.join(',')); }

// 3. While the page is hidden, nothing is sent; it starts when the page is back.
plan = ['ok']; calls.length = 0; setVisible('hidden');
const pending = sendToGalleryResilient(opts());
await new Promise(r => setTimeout(r, 50));
check('nothing is sent while the page is hidden', calls.length === 0, calls.join(','));
setVisible('visible');
await pending;
check('…and it uploads once the page is back on screen', calls.includes('ingest-complete'), calls.join(','));

// 4. A stalled transfer (no progress) is aborted, so the retry can run.
xhrMode = 'stall'; plan = ['ok']; calls.length = 0;
const realSetTimeout = globalThis.setTimeout;
(globalThis as any).setTimeout = (fn: any, ms: number) => realSetTimeout(fn, ms >= 45_000 ? 20 : ms);
try { await sendToGalleryResilient(opts(), 1); check('a stalled transfer is aborted', false, 'it succeeded'); }
catch (err: any) { check('a stalled transfer is aborted', /stalled/i.test(err?.message), err?.message); }
(globalThis as any).setTimeout = realSetTimeout;

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
