#!/usr/bin/env node
/**
 * claptrop-dashboard.mjs — live browser dashboard for the CLAPTROP card upload.
 *
 *   node scripts/claptrop-dashboard.mjs ["/Volumes/CLAPTROP 4"] [files-at-start]
 *   → http://localhost:4777
 *
 * Read-only: it counts files and reads the runner's logs (activity.log, upload-N.log,
 * batches.json, sort-new-uploads.log). It never touches the card, staging or Drive.
 * Binds to 127.0.0.1 only.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const CARD_ROOT = process.argv[2] || '/Volumes/CLAPTROP 4';
const START = +(process.argv[3] || 5625);
const WORK = path.join(os.homedir(), 'Desktop', `${path.basename(CARD_ROOT)} import`);
const LOGS = path.join(WORK, 'logs');
const ACT = path.join(LOGS, 'activity.log');
const STAGING = path.join(os.homedir(), 'Desktop', 'PHOTO UPLOADS');
const PORT = 4777;

function countFiles(dir) {
    let n = 0, bytes = 0;
    const walk = d => {
        let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
        for (const e of ents) {
            if (e.name.startsWith('.')) continue;
            const p = path.join(d, e.name);
            if (e.isDirectory()) walk(p);
            else { n++; try { bytes += fs.statSync(p).size; } catch {} }
        }
    };
    walk(dir);
    return { n, bytes };
}
const running = pat => { try { execFileSync('pgrep', ['-f', pat], { stdio: 'pipe' }); return true; } catch { return false; } };
const tail = (file, bytes) => {
    try {
        const st = fs.statSync(file); const len = Math.min(bytes, st.size);
        const fd = fs.openSync(file, 'r'); const b = Buffer.alloc(len);
        fs.readSync(fd, b, 0, len, st.size - len); fs.closeSync(fd);
        return b.toString('utf8');
    } catch { return ''; }
};
const latest = (dir, re) => {
    try { return fs.readdirSync(dir).filter(f => re.test(f)).map(f => path.join(dir, f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0]; }
    catch { return null; }
};

const PAUSE = path.join(path.dirname(new URL(import.meta.url).pathname), 'claptrop-pause.sh');
const pauseCmd = a => { try { return execFileSync('bash', [PAUSE, a], { stdio: 'pipe' }).toString().trim(); } catch { return 'stopped'; } };

// copy-rate sampling (bytes on the Mac in the current batch dir over time)
const samples = [];
function state() {
    const card = fs.existsSync(path.join(CARD_ROOT, 'DCIM')) ? countFiles(path.join(CARD_ROOT, 'DCIM')) : null;
    const actAll = tail(ACT, 2_000_000).split('\n').filter(Boolean);
    let lastHdr = -1;
    actAll.forEach((l, i) => { if (l.includes('════ BATCH')) lastHdr = i; });
    const cur = lastHdr >= 0 ? actAll.slice(lastHdr) : [];
    const hdr = cur[0] || '';
    const m = hdr.match(/BATCH (\d+)\/(\d+): (\d+) files, (\d+) GB/);
    const batch = m ? { i: +m[1], of: +m[2], files: +m[3], gb: +m[4] } : null;
    const bdir = batch ? path.join(WORK, `batch-${batch.i - 1}`) : null;
    const onMac = bdir ? countFiles(bdir) : { n: 0, bytes: 0 };
    const c = re => cur.filter(l => re.test(l)).length;
    const stepLine = [...cur].reverse().find(l => /STEP [123]\/3|WAITING|DONE —|NOT CLEAN|FAILED/.test(l)) || '';
    const step = (stepLine.match(/STEP ([123])\/3/) || [])[1] ? +stepLine.match(/STEP ([123])\/3/)[1] : 0;

    // live upload % from the raw pipeline log
    let now = null;
    const ulog = latest(LOGS, /^upload-\d+\.log$/);
    if (ulog && running('upload-to-drive.ts')) {
        const t = tail(ulog, 20000).split(/[\r\n]/).filter(Boolean);
        const pct = [...t].reverse().find(l => /: \d+%\s*$/.test(l));
        const up = [...t].reverse().find(l => /Uploading .*…|Zipping \d+ RAF/.test(l));
        if (pct || up) now = {
            file: (pct || up).trim().replace(/: \d+%\s*$/, '').replace(/^Uploading /, '').replace(/ \([\d.]+ [KMG]B\)…$/, ''),
            pct: pct ? +pct.match(/(\d+)%\s*$/)[1] : 0,
            label: up ? up.trim() : '',
        };
    }

    const t = Date.now();
    samples.push({ t, b: onMac.bytes }); while (samples.length && t - samples[0].t > 60_000) samples.shift();
    const rate = samples.length > 1 && step === 1 ? Math.max(0, (samples.at(-1).b - samples[0].b) / ((samples.at(-1).t - samples[0].t) / 1000)) : 0;

    const sortTail = tail(path.join(LOGS, 'sort-new-uploads.log'), 4000);
    const moved = [...sortTail.matchAll(/moved (\d+)/g)].map(x => +x[1]).pop() || 0;
    const sortDone = /Done: moved (\d+)/.exec(sortTail);
    let batches = [];
    try { batches = JSON.parse(fs.readFileSync(path.join(LOGS, 'batches.json'), 'utf8')).map(b => b.length); } catch {}

    return {
        at: new Date().toLocaleTimeString('en-US', { timeZone: 'America/Chicago' }),
        runner: running('claptrop-card-forever.sh') || running('claptrop-card-batches.sh'),
        paused: pauseCmd('status') === 'paused',
        card: card ? { left: card.n, gb: +(card.bytes / 1e9).toFixed(1), start: START } : null,
        batch, batches, step, stepLine: stepLine.replace(/^\d\d:\d\d:\d\d\s+/, ''),
        copied: onMac.n, verified: c(/VERIFIED/), mismatched: c(/MISMATCH/),
        uploaded: c(/✅ Uploaded/), skipped: c(/Skipping /), zips: c(/uploaded \+ verified/),
        staging: { jpg: countFiles(path.join(STAGING, 'jpg')).n, raf: countFiles(path.join(STAGING, 'raf')).n, mov: countFiles(path.join(STAGING, 'mov')).n },
        now, copyRate: rate,
        sort: { running: running('drive-sort-new-uploads.ts'), moved: sortDone ? +sortDone[1] : moved, done: !!sortDone },
        feed: actAll.slice(-150),
    };
}

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CLAPTROP Upload</title>
<style>
:root{--bg:#000;--fg:#fff;--dim:#8a8a8a;--line:#1c1c1c;--card:#0d0d0d;--green:#4ade80;--amber:#f59e0b;--red:#f87171;--blue:#60a5fa}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 -apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,sans-serif}
main{max-width:1200px;margin:0 auto;padding:24px 16px 40px}
h1{font-size:22px;letter-spacing:.12em;margin:0;text-transform:uppercase}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.pill{font-size:12px;letter-spacing:.1em;text-transform:uppercase;padding:6px 10px;background:var(--card)}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px;vertical-align:middle}
.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}
.card{background:var(--card);padding:18px}
.s12{grid-column:span 12}.s8{grid-column:span 8}.s4{grid-column:span 4}.s6{grid-column:span 6}
@media(max-width:820px){.s8,.s4,.s6{grid-column:span 12}}
.lbl{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);margin-bottom:8px}
.big{font-size:40px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.sub{color:var(--dim);font-variant-numeric:tabular-nums}
.bar{height:10px;background:rgba(255,255,255,.08);margin:10px 0 6px;overflow:hidden}
.bar>i{display:block;height:100%;background:var(--fg);transition:width .6s ease}
.bar.g>i{background:var(--green)}.bar.b>i{background:var(--blue)}.bar.a>i{background:var(--amber)}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@media(max-width:820px){.steps{grid-template-columns:1fr}}
.step{background:#080808;padding:14px;opacity:.45;transition:opacity .3s}
.step.on{opacity:1;outline:1px solid rgba(255,255,255,.18)}
.step.done{opacity:.8}
.step h3{margin:0 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase}
.now{font:13px ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}
.stats{display:flex;gap:22px;flex-wrap:wrap;margin-top:6px}
.stat b{display:block;font-size:22px;font-variant-numeric:tabular-nums}
.stat span{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim)}
#feed{height:420px;overflow:auto;font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;background:#050505;padding:10px 12px}
#feed div{white-space:pre;overflow:hidden;text-overflow:ellipsis}
.c-copy{color:#9ca3af}.c-ver{color:#a3a3a3}.c-up{color:var(--blue)}.c-ok{color:var(--green)}.c-skip{color:#737373}
.c-hdr{color:var(--amber);font-weight:700}.c-bad{color:var(--red);font-weight:700}
.btn{background:#fff;color:#000;font:700 13px -apple-system,Inter,sans-serif;letter-spacing:.12em;padding:10px 18px;border:0;cursor:pointer}
.btn.res{background:var(--green)}
.chips{display:flex;gap:4px;flex-wrap:wrap;margin-top:10px}
.chip{width:34px;height:8px;background:rgba(255,255,255,.1)}.chip.done{background:var(--green)}.chip.on{background:var(--amber)}
</style></head><body><main>
<div class="top"><h1>CLAPTROP UPLOAD</h1><div style="display:flex;gap:10px;align-items:center"><button id="pp" class="btn">⏸ PAUSE</button><div class="pill" id="runner"></div></div></div>
<div class="grid">
 <div class="card s8"><div class="lbl">Whole card</div><div class="big" id="cardPct">—</div>
  <div class="bar g"><i id="cardBar" style="width:0"></i></div><div class="sub" id="cardSub"></div>
  <div class="chips" id="chips"></div></div>
 <div class="card s4"><div class="lbl">Now</div><div class="now" id="stepLine">—</div>
  <div class="sub" id="rate" style="margin-top:10px"></div></div>
 <div class="card s12"><div class="lbl" id="batchLbl">Current batch</div>
  <div class="steps">
   <div class="step" id="st1"><h3>1 · Copy card → Mac</h3><div class="bar"><i id="b1"></i></div><div class="sub" id="t1"></div></div>
   <div class="step" id="st2"><h3>2 · Verify (md5 vs card)</h3><div class="bar"><i id="b2"></i></div><div class="sub" id="t2"></div></div>
   <div class="step" id="st3"><h3>3 · Upload to Drive</h3><div class="bar b"><i id="b3"></i></div><div class="sub" id="t3"></div></div>
  </div>
  <div id="nowBox" style="margin-top:14px;display:none"><div class="lbl">Uploading right now</div>
   <div class="now" id="nowFile"></div><div class="bar b"><i id="nowBar"></i></div><div class="sub" id="nowPct"></div></div>
 </div>
 <div class="card s6"><div class="lbl">This batch</div><div class="stats">
  <div class="stat"><b id="uUp">0</b><span>Uploaded</span></div>
  <div class="stat"><b id="uSk">0</b><span>Already in Drive</span></div>
  <div class="stat"><b id="uZ">0</b><span>RAW zips</span></div>
  <div class="stat"><b id="uBad">0</b><span>Mismatches</span></div></div></div>
 <div class="card s6"><div class="lbl">Waiting on the Mac (staging)</div><div class="stats">
  <div class="stat"><b id="sj">0</b><span>JPG</span></div><div class="stat"><b id="sr">0</b><span>RAF</span></div>
  <div class="stat"><b id="sm">0</b><span>MOV</span></div><div class="stat"><b id="so">—</b><span>Drive date sort</span></div></div></div>
 <div class="card s12"><div class="lbl">Live — every action as it happens <span id="at" style="float:right"></span></div><div id="feed"></div></div>
</div></main>
<script>
const $=id=>document.getElementById(id), pct=(a,b)=>b?Math.min(100,Math.round(a*100/b)):0;
let stick=true; const feed=$('feed'); feed.addEventListener('scroll',()=>{stick=feed.scrollTop+feed.clientHeight>=feed.scrollHeight-20});
function cls(l){return /FAILED|MISMATCH|NOT CLEAN|❌/.test(l)?'c-bad':/════|STEP |WAITING/.test(l)?'c-hdr':/✅|DONE —|uploaded \\+ verified/.test(l)?'c-ok':/Skipping/.test(l)?'c-skip':/Uploading|Zipping/.test(l)?'c-up':/VERIFIED/.test(l)?'c-ver':'c-copy'}
async function tick(){
 let s; try{s=await (await fetch('/state')).json()}catch{$('runner').innerHTML='<span class="dot" style="background:var(--red)"></span>Dashboard server stopped';return}
 $('runner').innerHTML='<span class="dot" style="background:'+(s.paused?'var(--amber)':s.runner?'var(--green)':'var(--red)')+'"></span>'+(s.paused?'Paused':s.runner?'Running':'Stopped — double-click RUN-CLAPTROP-4-UPLOAD.command');
 const pp=$('pp'); pp.style.display=s.runner?'':'none'; pp.textContent=s.paused?'▶ RESUME':'⏸ PAUSE'; pp.className='btn'+(s.paused?' res':''); pp.dataset.a=s.paused?'resume':'pause';
 $('at').textContent=s.at+' CT';
 if(s.card){const done=s.card.start-s.card.left;$('cardPct').textContent=pct(done,s.card.start)+'%';$('cardBar').style.width=pct(done,s.card.start)+'%';
  $('cardSub').textContent=done.toLocaleString()+' of '+s.card.start.toLocaleString()+' files uploaded & cleared · '+s.card.left.toLocaleString()+' left on card ('+s.card.gb+' GB)'}
 else{$('cardPct').textContent='—';$('cardSub').textContent='Card not mounted'}
 const b=s.batch; $('chips').innerHTML=b?Array.from({length:b.of},(_,i)=>'<div class="chip '+(i+1<b.i?'done':i+1===b.i?'on':'')+'"></div>').join(''):'';
 $('batchLbl').textContent=b?('Batch '+b.i+' of '+b.of+' · '+b.files.toLocaleString()+' files · '+b.gb+' GB'):'Current batch';
 $('stepLine').textContent=s.stepLine||'—';
 $('rate').textContent=s.copyRate>0?('Copying at '+(s.copyRate/1e6).toFixed(0)+' MB/s'):'';
 const tot=b?b.files:0, handled=s.uploaded+s.skipped;
 [[1,s.copied],[2,s.verified],[3,handled]].forEach(([i,v])=>{$('b'+i).style.width=pct(v,tot)+'%';$('t'+i).textContent=v.toLocaleString()+' / '+tot.toLocaleString()+' ('+pct(v,tot)+'%)';
  $('st'+i).className='step'+(s.step===i?' on':s.step>i?' done':'')});
 if(s.now){$('nowBox').style.display='';$('nowFile').textContent=s.now.file;$('nowBar').style.width=s.now.pct+'%';$('nowPct').textContent=s.now.pct+'%'+(s.now.label&&/Zipping/.test(s.now.label)?' · '+s.now.label:'')}else $('nowBox').style.display='none';
 $('uUp').textContent=s.uploaded;$('uSk').textContent=s.skipped;$('uZ').textContent=s.zips;$('uBad').textContent=s.mismatched;
 $('sj').textContent=s.staging.jpg;$('sr').textContent=s.staging.raf;$('sm').textContent=s.staging.mov;
 $('so').textContent=s.sort.done?('Done · '+s.sort.moved.toLocaleString()):s.sort.running?(s.sort.moved.toLocaleString()+' moved'):'—';
 feed.innerHTML=s.feed.map(l=>'<div class="'+cls(l)+'">'+l.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</div>').join('');
 if(stick)feed.scrollTop=feed.scrollHeight;
}
$('pp').onclick=async()=>{const a=$('pp').dataset.a||'pause';$('pp').disabled=true;await fetch('/'+a,{method:'POST'});$('pp').disabled=false;tick()};
tick();setInterval(tick,1000);
</script></body></html>`;

http.createServer((req, res) => {
    if (req.method === 'POST' && (req.url === '/pause' || req.url === '/resume')) {
        const r = pauseCmd(req.url.slice(1)); res.writeHead(200, { 'content-type': 'text/plain' }); res.end(r); return;
    }
    if (req.url === '/state') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(state())); return; }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(PAGE);
}).listen(PORT, '127.0.0.1', () => console.log(`CLAPTROP dashboard → http://localhost:${PORT}`));
