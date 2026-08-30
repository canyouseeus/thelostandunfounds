/**
 * Microsite renderer.
 *
 * Turns a page's block list into a complete static HTML document.
 *
 * Design constraints are inherited from the platform skills and are not
 * stylistic preferences — they are enforced by `npm run microsites:lint`:
 *   - `.claude/skills/no-border-design`  : no border-*, no shadow, no ring,
 *                                          no outline, no gradient. Ever.
 *   - `.claude/skills/noir-design`       : #000 background, white text,
 *                                          border-radius 0, UPPERCASE h1/h2,
 *                                          body copy always left-aligned.
 *   - CLAUDE.md "Page Title Style Rule"  : h1 headings are UPPERCASE.
 *   - `frontend-style-guide` rule 2      : nothing clips at 320px.
 *
 * Separation comes from surface tone and spacing only. The surface ladder:
 *   base #000 · raised #0a0a0a · subtle rgba(255,255,255,.05)
 *   · interactive rgba(255,255,255,.10) · inverted #fff on #000
 */

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const money = (n) => '$' + Number(n).toLocaleString('en-US');

/* ------------------------------------------------------------------ *
 * Stylesheet — inlined into every page.
 *
 * Inlined rather than linked on purpose: the whole sheet is ~4KB, and a
 * microsite lives or dies on Core Web Vitals. One render-blocking request
 * removed is worth more here than cache reuse across a 16-page site.
 * ------------------------------------------------------------------ */
export function css() {
  return `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{
  background:#000;color:rgba(255,255,255,.87);
  font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  font-size:16px;line-height:1.65;text-align:left;
  overflow-x:hidden;
}
img{max-width:100%;height:auto;display:block}
a{color:#fff;text-decoration:none}
a:hover{text-decoration:underline}

/* Focus indicator by tone inversion, not an outline.
   no-border-design bans outline/ring; dropping focus styling entirely
   would be an accessibility regression, so we invert the surface instead. */
a:focus-visible,button:focus-visible,input:focus-visible,
textarea:focus-visible,select:focus-visible{
  outline:none;background:#fff;color:#000;text-decoration:none;
}

.wrap{max-width:64rem;margin:0 auto;padding:0 1.25rem}
@media(min-width:640px){.wrap{padding:0 2rem}}

/* ---- header ---- */
.hdr{position:sticky;top:0;z-index:50;background:rgba(0,0,0,.95);backdrop-filter:blur(12px)}
.hdr-in{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;padding:.85rem 0}
.logo{font-weight:800;font-size:.8rem;letter-spacing:.18em;text-transform:uppercase;line-height:1.2}
.logo span{display:block;font-weight:500;font-size:.62rem;letter-spacing:.22em;color:rgba(255,255,255,.45)}
.nav{display:flex;gap:.25rem;flex-wrap:wrap;align-items:center}
.nav a{
  font-size:.65rem;letter-spacing:.18em;text-transform:uppercase;font-weight:700;
  color:rgba(255,255,255,.55);padding:.5rem .6rem;flex-shrink:0;
}
.nav a:hover{color:#fff;background:rgba(255,255,255,.1);text-decoration:none}
.nav a[aria-current="page"]{color:#fff}

/* ---- type ---- */
h1{
  text-transform:uppercase;font-weight:800;color:#fff;line-height:1.05;
  font-size:clamp(1.9rem,7vw,3.4rem);letter-spacing:-.01em;
  overflow-wrap:break-word;
}
h2{
  text-transform:uppercase;font-weight:800;color:#fff;line-height:1.15;
  font-size:clamp(1.15rem,3.4vw,1.6rem);letter-spacing:.02em;
  margin-bottom:1.1rem;overflow-wrap:break-word;
}
h3{font-weight:700;color:#fff;font-size:1rem;line-height:1.35;margin-bottom:.4rem}
p{margin-bottom:1rem;max-width:64ch}
p:last-child{margin-bottom:0}

.kicker{
  font-size:.65rem;letter-spacing:.24em;text-transform:uppercase;font-weight:700;
  color:rgba(255,255,255,.45);margin-bottom:1.1rem;
}
section{padding:3rem 0}
@media(min-width:640px){section{padding:4rem 0}}
.raised{background:#0a0a0a}
.sub{background:rgba(255,255,255,.05)}

/* ---- buttons ---- */
.btn,.btn-ghost{
  display:inline-block;border-radius:0;font-weight:800;font-size:.72rem;
  letter-spacing:.18em;text-transform:uppercase;padding:.95rem 1.6rem;
  transition:background .15s,color .15s;cursor:pointer;
  font-family:inherit;
}
.btn{background:#fff;color:#000}
.btn:hover{background:rgba(255,255,255,.1);color:#fff;text-decoration:none}
.btn-ghost{background:rgba(255,255,255,.1);color:#fff}
.btn-ghost:hover{background:#fff;color:#000;text-decoration:none}
.btns{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:2rem}

/* ---- hero ---- */
.hero{padding:3.5rem 0 3rem}
@media(min-width:640px){.hero{padding:5.5rem 0 4.5rem}}
.hero p.lede{font-size:clamp(1rem,2.4vw,1.2rem);color:rgba(255,255,255,.7);max-width:52ch;margin-top:1.5rem}

/* ---- grid + cards ---- */
.grid{display:grid;gap:1px;grid-template-columns:1fr}
@media(min-width:560px){.grid.c2,.grid.c3,.grid.c4{grid-template-columns:repeat(2,1fr)}}
@media(min-width:900px){.grid.c3{grid-template-columns:repeat(3,1fr)}.grid.c4{grid-template-columns:repeat(4,1fr)}}
.card{background:rgba(255,255,255,.05);border-radius:0;padding:1.5rem}
.card.link:hover{background:rgba(255,255,255,.1)}
.card .meta{font-size:.65rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.45);font-weight:700}
.price{font-size:2rem;font-weight:800;color:#fff;line-height:1;margin:.65rem 0 .3rem}
.price .from{font-size:.65rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.45);display:block;margin-bottom:.35rem}

/* ---- steps ---- */
.step{background:rgba(255,255,255,.05);padding:1.5rem}
.step .n{
  font-size:.65rem;letter-spacing:.24em;font-weight:800;
  color:rgba(255,255,255,.45);margin-bottom:.75rem;display:block;
}

/* ---- checklist ---- */
ul.check{list-style:none;display:grid;gap:1px}
ul.check li{background:rgba(255,255,255,.05);padding:1rem 1.25rem;max-width:none}
ul.check li::before{content:"—";color:rgba(255,255,255,.4);margin-right:.75rem;font-weight:700}

/* ---- faq ---- */
.faq{display:grid;gap:1px}
.faq details{background:rgba(255,255,255,.05);padding:1.25rem 1.5rem}
.faq summary{
  cursor:pointer;font-weight:700;color:#fff;list-style:none;
  display:flex;justify-content:space-between;gap:1rem;align-items:baseline;
}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";color:rgba(255,255,255,.45);font-weight:800;flex-shrink:0}
.faq details[open] summary::after{content:"–"}
.faq details[open] summary{margin-bottom:.85rem}
.faq p{color:rgba(255,255,255,.72)}

/* ---- table ---- */
.tw{overflow-x:auto;background:rgba(255,255,255,.05)}
table{border-collapse:collapse;width:100%;min-width:34rem;font-size:.9rem}
th,td{text-align:left;padding:.9rem 1.1rem;vertical-align:top}
th{
  font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;
  color:rgba(255,255,255,.45);font-weight:800;background:#0a0a0a;
}
tbody tr:nth-child(even){background:rgba(255,255,255,.04)}
.note{font-size:.78rem;color:rgba(255,255,255,.45);margin-top:.9rem}

/* ---- form ---- */
form{display:grid;gap:1px;max-width:38rem}
label{display:block;background:rgba(255,255,255,.05);padding:1rem 1.25rem}
label .lb{
  display:block;font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;
  font-weight:800;color:rgba(255,255,255,.45);margin-bottom:.5rem;
}
input,textarea,select{
  width:100%;background:transparent;color:#fff;border:0;border-radius:0;
  font:inherit;font-size:.95rem;padding:0;
}
input::placeholder,textarea::placeholder{color:rgba(255,255,255,.3)}
textarea{resize:vertical;min-height:5.5rem}

/* ---- footer ---- */
.ftr{background:#0a0a0a;padding:3rem 0 2.5rem;margin-top:1px}
.ftr .cols{display:grid;gap:2rem;grid-template-columns:1fr}
@media(min-width:640px){.ftr .cols{grid-template-columns:repeat(3,1fr)}}
.ftr h3{
  font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;
  color:rgba(255,255,255,.45);margin-bottom:.9rem;
}
.ftr a{color:rgba(255,255,255,.65);font-size:.88rem;display:block;padding:.2rem 0}
.ftr a:hover{color:#fff}
.legal{margin-top:2.5rem;font-size:.72rem;color:rgba(255,255,255,.35);line-height:1.7}

/* ---- draft banner ---- */
.draft{background:#fff;color:#000;padding:.6rem 0;font-weight:800;
  font-size:.65rem;letter-spacing:.2em;text-transform:uppercase}

.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
.skip:focus-visible{position:fixed;top:.5rem;left:.5rem;width:auto;height:auto;
  clip:auto;padding:.75rem 1rem;z-index:100}
`.trim();
}

/* ------------------------------------------------------------------ *
 * Block renderers
 * ------------------------------------------------------------------ */

const blocks = {
  hero: (b, ctx) => `
<header class="hero">
  <div class="wrap">
    ${b.kicker ? `<div class="kicker">${esc(b.kicker)}</div>` : ''}
    <h1>${esc(ctx.page.h1)}</h1>
    ${b.sub ? `<p class="lede">${esc(b.sub)}</p>` : ''}
    ${b.primary || b.secondary ? `<div class="btns">
      ${b.primary ? `<a class="btn" href="${esc(b.primary.href)}">${esc(b.primary.label)}</a>` : ''}
      ${b.secondary ? `<a class="btn-ghost" href="${esc(b.secondary.href)}">${esc(b.secondary.label)}</a>` : ''}
    </div>` : ''}
  </div>
</header>`,

  prose: (b) => `
<section>
  <div class="wrap">
    ${b.heading ? `<h2>${esc(b.heading)}</h2>` : ''}
    ${(b.body || []).map((p) => `<p>${esc(p)}</p>`).join('\n    ')}
  </div>
</section>`,

  pricing: (b, ctx) => `
<section class="raised">
  <div class="wrap">
    ${b.heading ? `<h2>${esc(b.heading)}</h2>` : ''}
    <div class="grid c4">
      ${ctx.site.services
        .map(
          (s) => `<div class="card">
        <div class="meta">${esc(s.name)}</div>
        <div class="price">${s.unit === 'from' ? '<span class="from">From</span>' : ''}${money(s.price)}</div>
        <p>${esc(s.photos)}<br>${esc(s.turnaround)} delivery</p>
      </div>`
        )
        .join('\n      ')}
    </div>
    ${b.note ? `<p class="note">${esc(b.note)}</p>` : ''}
  </div>
</section>`,

  addons: (b, ctx) => `
<section>
  <div class="wrap">
    ${b.heading ? `<h2>${esc(b.heading)}</h2>` : ''}
    <div class="grid c3">
      ${ctx.site.addons
        .map(
          (a) => `<div class="card">
        <div class="meta">+${money(a.price)}</div>
        <h3>${esc(a.name)}</h3>
        <p>${esc(a.note)}</p>
      </div>`
        )
        .join('\n      ')}
    </div>
  </div>
</section>`,

  steps: (b) => `
<section class="raised">
  <div class="wrap">
    ${b.heading ? `<h2>${esc(b.heading)}</h2>` : ''}
    <div class="grid c4">
      ${b.items
        .map(
          (s, i) => `<div class="step">
        <span class="n">${String(i + 1).padStart(2, '0')}</span>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.body)}</p>
      </div>`
        )
        .join('\n      ')}
    </div>
  </div>
</section>`,

  checklist: (b) => `
<section>
  <div class="wrap">
    ${b.heading ? `<h2>${esc(b.heading)}</h2>` : ''}
    ${b.intro ? `<p>${esc(b.intro)}</p><div style="height:1.25rem"></div>` : ''}
    <ul class="check">
      ${b.items.map((i) => `<li>${esc(i)}</li>`).join('\n      ')}
    </ul>
  </div>
</section>`,

  faq: (b) => `
<section class="raised">
  <div class="wrap">
    ${b.heading ? `<h2>${esc(b.heading)}</h2>` : ''}
    <div class="faq">
      ${b.items
        .map(
          (f) => `<details>
        <summary>${esc(f.q)}</summary>
        <p>${esc(f.a)}</p>
      </details>`
        )
        .join('\n      ')}
    </div>
  </div>
</section>`,

  areas: (b, ctx) => `
<section>
  <div class="wrap">
    ${b.heading ? `<h2>${esc(b.heading)}</h2>` : ''}
    <div class="grid c3">
      ${ctx.areas
        .map(
          (a) => `<a class="card link" href="/areas/${esc(a.slug)}/">
        <div class="meta">${esc(a.zips.join(' · '))}</div>
        <h3>${esc(a.name)}</h3>
        <p>${esc(a.typical)}</p>
      </a>`
        )
        .join('\n      ')}
    </div>
    ${b.note ? `<p class="note">${esc(b.note)}</p>` : ''}
  </div>
</section>`,

  table: (b) => `
<section>
  <div class="wrap">
    ${b.heading ? `<h2>${esc(b.heading)}</h2>` : ''}
    <div class="tw">
      <table>
        <thead><tr>${b.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>
          ${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('\n          ')}
        </tbody>
      </table>
    </div>
    ${b.note ? `<p class="note">${esc(b.note)}</p>` : ''}
  </div>
</section>`,

  cta: (b) => `
<section class="sub">
  <div class="wrap">
    <h2>${esc(b.heading)}</h2>
    ${b.body ? `<p>${esc(b.body)}</p>` : ''}
    <div class="btns"><a class="btn" href="${esc(b.button.href)}">${esc(b.button.label)}</a></div>
  </div>
</section>`,

  /* The form posts to the parent platform's existing booking intake rather
     than standing up a second backend for a static site. */
  quoteform: (_b, ctx) => `
<section>
  <div class="wrap">
    <form method="POST" action="${esc(ctx.site.business.bookingUrl)}">
      <input type="hidden" name="source" value="${esc(ctx.site.domain)}">
      <input type="hidden" name="service" value="Airbnb / Short-Term Rental">
      <label><span class="lb">Name</span><input name="name" required autocomplete="name" placeholder="Your name"></label>
      <label><span class="lb">Email</span><input type="email" name="email" required autocomplete="email" placeholder="you@example.com"></label>
      <label><span class="lb">Property address or neighborhood</span><input name="address" required placeholder="E.g. 78704, or 1200 S Congress Ave"></label>
      <label><span class="lb">Bedrooms</span>
        <select name="bedrooms" required>
          <option value="">Select…</option>
          <option>Studio / 1BR</option><option>2 Bedroom</option>
          <option>3 Bedroom</option><option>4BR+ / Luxury</option>
        </select>
      </label>
      <label><span class="lb">Anything else</span><textarea name="notes" placeholder="Target listing date, add-ons you're considering, access details"></textarea></label>
      <button class="btn" type="submit">Request quote</button>
    </form>
  </div>
</section>`,
};

/* ------------------------------------------------------------------ *
 * Page shell
 * ------------------------------------------------------------------ */

const NAV = [
  ['/pricing/', 'Pricing'],
  ['/short-term-rental-photography/', 'Service'],
  ['/airbnb-photography-cost-austin/', 'Costs'],
  ['/how-to-prep-your-airbnb-for-photos/', 'Prep guide'],
  ['/contact/', 'Quote'],
];

function header(ctx) {
  return `
<header class="hdr">
  <div class="wrap hdr-in">
    <a class="logo" href="/">${esc(ctx.site.brand)}<span>${esc(ctx.site.geo.city)}, ${esc(ctx.site.geo.region)}</span></a>
    <nav class="nav" aria-label="Main">
      ${NAV.map(
        ([href, label]) =>
          `<a href="${href}"${ctx.path === href ? ' aria-current="page"' : ''}>${esc(label)}</a>`
      ).join('\n      ')}
    </nav>
  </div>
</header>`;
}

function footer(ctx) {
  const { site, areas } = ctx;
  const phone = site.business.phone;
  const phoneOk = /^\+?[\d\s().-]{10,}$/.test(phone);
  return `
<footer class="ftr">
  <div class="wrap">
    <div class="cols">
      <div>
        <h3>Service area</h3>
        ${areas.slice(0, 5).map((a) => `<a href="/areas/${esc(a.slug)}/">${esc(a.name)}</a>`).join('\n        ')}
      </div>
      <div>
        <h3>Pages</h3>
        ${NAV.map(([h, l]) => `<a href="${h}">${esc(l)}</a>`).join('\n        ')}
      </div>
      <div>
        <h3>Contact</h3>
        <a href="mailto:${esc(site.business.email)}">${esc(site.business.email)}</a>
        ${phoneOk ? `<a href="tel:${esc(phone.replace(/[^\d+]/g, ''))}">${esc(phone)}</a>` : ''}
        <a href="${esc(site.business.parentUrl)}">${esc(site.business.legalName)}</a>
      </div>
    </div>
    <p class="legal">
      ${esc(site.brand)} is the ${esc(site.geo.city)} short-term rental photography service of
      ${esc(site.business.legalName)}. Serving ${esc(site.geo.city)} and the surrounding
      ${site.geo.serviceRadiusMiles}-mile metro.<br>
      &copy; ${new Date().getFullYear()} ${esc(site.business.legalName)}. All rights reserved.
    </p>
  </div>
</footer>`;
}

/**
 * Render one page to a complete HTML document.
 * `head` carries the SEO block (meta, canonical, JSON-LD) built by seo.mjs.
 */
export function renderPage(ctx, head) {
  const { page, draft } = ctx;
  const body = page.blocks
    .map((b) => {
      const fn = blocks[b.type];
      if (!fn) throw new Error(`Unknown block type "${b.type}" on page "/${page.slug}"`);
      return fn(b, ctx);
    })
    .join('\n');

  // Pages without a hero block still need their h1 rendered.
  const hasHero = page.blocks.some((b) => b.type === 'hero');
  const title = hasHero
    ? ''
    : `<header class="hero"><div class="wrap"><h1>${esc(page.h1)}</h1></div></header>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${head}
<style>${css()}</style>
</head>
<body>
<a class="sr skip btn" href="#main">Skip to content</a>
${draft ? '<div class="draft"><div class="wrap">Draft build — not for deployment</div></div>' : ''}
${header(ctx)}
<main id="main">
${title}${body}
</main>
${footer(ctx)}
</body>
</html>
`;
}

export { esc, money };
