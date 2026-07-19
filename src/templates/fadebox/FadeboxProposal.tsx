import { Helmet } from 'react-helmet-async';

/* ============================================================
   THE LOST+UNFOUNDS — Proposal for Fadebox Barbershop
   Print-ready (Letter) 3-page proposal. Public, noindex.
   Route: /fadebox-preview/proposal
   ============================================================ */

const css = `
  :root{
    --paper:#ffffff;
    --ink:#0a0a0a;
    --soft:#3a3a3a;
    --muted:#7a7a7a;
    --rule:#0a0a0a;
    --rule-soft:#d8d8d8;
  }
  @page { size: Letter; margin: 0; }
  .fbprop *{box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact;}
  .fbprop{margin:0;padding:0;background:var(--paper);color:var(--ink);
    font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
    -webkit-font-smoothing:antialiased;}

  .fbprop .page{
    width:100%; max-width:8.5in; min-height:11in;
    padding:0.85in 0.95in;
    background:var(--paper);
    position:relative;
    page-break-after:always;
    display:flex; flex-direction:column;
    overflow:hidden;
    margin:0 auto;
    border-bottom:1px solid #ededed;
  }
  @media print{ .fbprop .page{width:8.5in; height:11in; margin:0; border:0;} }
  .fbprop .page:last-child{page-break-after:auto;}

  .fbprop .runhead{
    display:flex; justify-content:space-between; align-items:center;
    font-size:8.5px; letter-spacing:.28em; text-transform:uppercase;
    color:var(--ink); font-weight:700;
  }
  .fbprop .runhead .sep{letter-spacing:.4em;}
  .fbprop .runhead .left{display:flex; gap:24px;}

  .fbprop .cover-body{
    flex:1; display:flex; flex-direction:column; align-items:center;
    text-align:center; padding-top:0.5in;
  }
  .fbprop .cover-logo{ width:150px; height:150px; margin-bottom:22px; display:flex; align-items:center; justify-content:center; }
  .fbprop .cover-logo img{ width:100%; height:100%; object-fit:contain; }
  .fbprop .cover-brand{ font-size:13px; letter-spacing:.42em; text-transform:uppercase; font-weight:800; margin-bottom:4px; }
  .fbprop .cover-tag{ font-size:10px; letter-spacing:.32em; text-transform:uppercase; color:var(--muted); font-weight:500; margin-bottom:50px; }
  .fbprop .cover-label{ font-size:9px; letter-spacing:.36em; text-transform:uppercase; color:var(--muted); font-weight:700; margin-bottom:10px; }
  .fbprop .cover-h1{ font-size:40px; line-height:1.02; letter-spacing:-.01em; font-weight:800; text-transform:uppercase; margin:0 0 8px; }
  .fbprop .cover-h1-sub{ font-size:13px; color:var(--soft); margin:0 0 46px; font-weight:400; }

  .fbprop .cover-grid{ display:grid; grid-template-columns:1fr 1fr; gap:36px; text-align:left; width:100%; max-width:520px; margin-bottom:36px; }
  .fbprop .cover-grid .field .k{ font-size:9px; letter-spacing:.28em; text-transform:uppercase; color:var(--muted); font-weight:700; margin-bottom:6px; }
  .fbprop .cover-grid .field .v{ font-size:12px; line-height:1.65; font-weight:600; }
  .fbprop .cover-grid .field .v .lite{color:var(--soft); font-weight:400;}

  .fbprop .cover-dates{ display:flex; gap:48px; margin-top:auto; margin-bottom:8px; }
  .fbprop .cover-dates .d{ font-size:9px; letter-spacing:.22em; text-transform:uppercase; color:var(--muted); font-weight:700; }
  .fbprop .cover-dates .d span{ display:block; font-size:12px; letter-spacing:.02em; color:var(--ink); font-weight:700; margin-top:3px; text-transform:none; }

  .fbprop .runfoot{
    display:flex; justify-content:space-between; align-items:center;
    font-size:8px; letter-spacing:.3em; text-transform:uppercase;
    color:var(--muted); font-weight:600; margin-top:auto; padding-top:14px;
  }

  .fbprop .pagehead{ margin-bottom:18px; }
  .fbprop .pagehead .sect{ font-size:10px; letter-spacing:.34em; text-transform:uppercase; font-weight:800; margin-bottom:14px; }
  .fbprop .pagehead h2{ font-size:33px; line-height:1.04; letter-spacing:-.01em; font-weight:800; text-transform:uppercase; margin:0; max-width:20ch; }

  .fbprop p.lede{ font-size:13px; line-height:1.7; color:var(--ink); max-width:64ch; margin:0 0 20px; }
  .fbprop p.body{ font-size:12.5px; line-height:1.7; color:var(--soft); max-width:64ch; margin:0 0 16px; }

  .fbprop .rule{height:2px; background:var(--rule); border:0; margin:16px 0 22px;}

  .fbprop .subhead{ font-size:10px; letter-spacing:.32em; text-transform:uppercase; font-weight:800; margin:6px 0 14px; }

  .fbprop ul.list{list-style:none; padding:0; margin:0 0 18px;}
  .fbprop ul.list li{ position:relative; padding-left:18px; margin-bottom:9px; font-size:12.5px; line-height:1.65; color:var(--ink); }
  .fbprop ul.list li::before{ content:"■"; position:absolute; left:0; top:0; font-size:8px; color:var(--ink); line-height:1.95; }
  .fbprop ul.list li .lite{color:var(--soft);}

  .fbprop .stat-row{ display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--rule-soft); margin:4px 0 22px; }
  .fbprop .stat-row .cell{ background:var(--paper); padding:14px 12px; }
  .fbprop .stat-row .cell .n{ font-size:26px; font-weight:800; letter-spacing:-.02em; line-height:1; }
  .fbprop .stat-row .cell .l{ font-size:8.5px; letter-spacing:.18em; text-transform:uppercase; color:var(--muted); font-weight:700; margin-top:8px; }

  .fbprop .invest{ width:100%; border-collapse:collapse; margin-top:8px; margin-bottom:20px; }
  .fbprop .invest th, .fbprop .invest td{ text-align:left; padding:14px 0; border-bottom:1px solid var(--rule-soft); font-size:11.5px; vertical-align:top; }
  .fbprop .invest thead th{ font-size:9px; letter-spacing:.28em; text-transform:uppercase; font-weight:800; color:var(--muted); padding-bottom:10px; border-bottom:2px solid var(--rule); }
  .fbprop .invest .item{font-weight:700; line-height:1.5;}
  .fbprop .invest .item small{display:block; font-weight:400; color:var(--soft); margin-top:3px; font-size:11px; line-height:1.55;}
  .fbprop .invest .freq{color:var(--soft); font-size:11px;}
  .fbprop .invest .price{text-align:right; font-weight:800; font-size:13px; font-variant-numeric:tabular-nums;}
  .fbprop .invest .price small{display:block; font-weight:400; color:var(--muted); font-size:10px; margin-top:2px;}
  .fbprop .invest tr.total td{border-bottom:0; padding-top:16px;}
  .fbprop .invest tr.total .item{font-size:12px; text-transform:uppercase; letter-spacing:.06em;}
  .fbprop .invest tr.total .price{font-size:16px;}

  .fbprop .callout{ background:#0a0a0a; color:#fff; padding:16px 20px; }
  .fbprop .callout .k{ font-size:9.5px; letter-spacing:.26em; text-transform:uppercase; font-weight:800; margin-bottom:8px; }
  .fbprop .callout .v{ font-size:11.5px; line-height:1.7; color:rgba(255,255,255,.72); }
  .fbprop .callout.soft{ background:#f4f4f4; color:var(--ink); }
  .fbprop .callout.soft .v{ color:var(--soft); }

  .fbprop .sign{ display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:auto; padding-top:20px; }
  .fbprop .sign .col .k{ font-size:9px; letter-spacing:.24em; text-transform:uppercase; color:var(--muted); font-weight:700; margin-bottom:28px; }
  .fbprop .sign .col .line{ height:2px; background:var(--rule); margin-bottom:8px; }
  .fbprop .sign .col .who{ font-size:12px; font-weight:700; }
  .fbprop .sign .col .role{ font-size:10px; color:var(--muted); margin-top:2px; }

  .fbprop .toolbar{ position:sticky; top:0; z-index:20; display:flex; justify-content:center; gap:10px;
    background:#0a0a0a; padding:10px; }
  .fbprop .toolbar button, .fbprop .toolbar a{ font-family:inherit; cursor:pointer; font-size:10px; font-weight:800;
    letter-spacing:.16em; text-transform:uppercase; padding:9px 16px; border:0; background:#fff; color:#0a0a0a; text-decoration:none; }
  .fbprop .toolbar a.ghost{ background:transparent; color:#fff; box-shadow:inset 0 0 0 1px rgba(255,255,255,.4); }
  @media print{ .fbprop .toolbar{ display:none; } }
`;

const RUNHEAD = (
  <div className="runhead">
    <div className="left"><span>THE LOST+UNFOUNDS</span><span className="sep">·</span><span>Fadebox Barbershop Proposal</span></div>
  </div>
);

export default function FadeboxProposal() {
  return (
    <>
      <Helmet>
        <title>THE LOST+UNFOUNDS — Proposal for Fadebox Barbershop</title>
        <meta name="robots" content="noindex, nofollow" />
        <style>{css}</style>
      </Helmet>

      <div className="fbprop">
        <div className="toolbar">
          <button onClick={() => window.print()}>Print / Save PDF</button>
          <a className="ghost" href="/fadebox-preview">View the live site</a>
          <a className="ghost" href="/fadebox-preview/dashboard">Owner dashboard</a>
        </div>

        {/* PAGE 1 — COVER */}
        <section className="page">
          {RUNHEAD}
          <div className="cover-body">
            <div className="cover-logo"><img src="https://www.thelostandunfounds.com/logo.png" alt="THE LOST+UNFOUNDS" /></div>
            <div className="cover-brand">THE LOST+UNFOUNDS</div>
            <div className="cover-tag">Can you see us?</div>

            <div className="cover-label">Proposal</div>
            <h1 className="cover-h1">Website, In-House<br />Booking &amp; Dashboard</h1>
            <p className="cover-h1-sub">Prepared for Fadebox Barbershop · Austin, TX</p>

            <div className="cover-grid">
              <div className="field">
                <div className="k">Prepared by</div>
                <div className="v">Joshua Greene<br /><span className="lite">THE LOST AND UNFOUNDS LLC.</span><br /><span className="lite">business@thelostandunfounds.com</span></div>
              </div>
              <div className="field">
                <div className="k">Prepared for</div>
                <div className="v">Eric Alderete<br /><span className="lite">Fadebox Barbershop</span><br /><span className="lite">4 studios · Austin, TX · (512) 995-5636</span></div>
              </div>
            </div>

            <div className="cover-dates">
              <div className="d">Proposal Date<span>July 19, 2026</span></div>
              <div className="d">Valid Through<span>November 30, 2026</span></div>
              <div className="d">15% Early Rate<span>Commit by Aug 19</span></div>
            </div>
          </div>
          <div className="runfoot"><div>Sharpest fades in Austin · Booked in house</div><div>Page 1 / 3</div></div>
        </section>

        {/* PAGE 2 — OPPORTUNITY + WHAT YOU GET */}
        <section className="page">
          {RUNHEAD}
          <div className="pagehead">
            <div className="sect">01 · The Opportunity</div>
            <h2>You built the reputation. The site gives it away.</h2>
          </div>

          <div className="stat-row">
            <div className="cell"><div className="n">4.9★</div><div className="l">Avg rating</div></div>
            <div className="cell"><div className="n">3,500+</div><div className="l">Reviews · team-wide</div></div>
            <div className="cell"><div className="n">26</div><div className="l">Barbers</div></div>
            <div className="cell"><div className="n">4</div><div className="l">Studios</div></div>
          </div>

          <p className="lede">
            You're opening a fifth studio in San Antonio — so the last thing you need is a website project pulling at your attention. That's the whole idea here: this fixes the one thing quietly costing you bookings, and it's built to run without you. In fact, it already does — a working version is live today.
          </p>
          <p className="body">
            Fadebox has earned what most shops never will — a 4.9-star average across 3,500+ reviews, a loyal following, and twenty-six barbers across four studios. But the site is plain, and every booking still hands your customer to Booksy: lost traffic, lost data, and a brand experience that ends the second someone tries to book. Opening a fifth location makes that leak bigger, not smaller.
          </p>

          <hr className="rule" />

          <div className="subhead">02 · What you get</div>
          <ul className="list">
            <li><strong>A custom black-and-white redesign</strong> — <span className="lite">your brand colors, done right: sharp, premium, mobile-first. A site that finally matches the work.</span></li>
            <li><strong>One booking system for every barber</strong> — <span className="lite">right now your barbers are split across Booksy, Squire, and links that break. This puts all 4 studios and every barber behind one flow on your own site — no redirects, no dead links, no lost customers.</span></li>
            <li><strong>Google reviews — front and center, and growing</strong> — <span className="lite">a live marquee of your best reviews across the page, plus an automatic review request after every visit so each barber's Google presence keeps building — including the ones starting from zero today.</span></li>
            <li><strong>All four studios, one flow</strong> — <span className="lite">Triangle, Off-5th, Box Boyz &amp; Studio in a single switcher — with San Antonio ready to flip on the day it opens.</span></li>
            <li><strong>Owner dashboard</strong> — <span className="lite">today's chairs, revenue, barber leaderboard, chair utilization, and your review feed — one screen, no spreadsheets.</span></li>
            <li><strong>Instant confirmations &amp; no-show protection</strong> — <span className="lite">text confirmations, card-on-file, easy rebooking. You keep the traffic, the data, and the brand.</span></li>
          </ul>

          <div className="callout soft">
            <div className="k">See it live — already built</div>
            <div className="v">A working preview is live now: <strong>thelostandunfounds.com/fadebox-preview</strong> — try the booking flow and the owner dashboard at <strong>/fadebox-preview/dashboard</strong>. This isn't a mockup you have to imagine; it already runs.</div>
          </div>

          <div className="runfoot"><div>Sharpest fades in Austin · Booked in house</div><div>Page 2 / 3</div></div>
        </section>

        {/* PAGE 3 — INVESTMENT + ACCEPTANCE */}
        <section className="page">
          {RUNHEAD}
          <div className="pagehead">
            <div className="sect">03 · Investment &amp; Next Steps</div>
            <h2>Flat rates. Built around your opening.</h2>
          </div>

          <p className="lede">
            We know your focus is on San Antonio — as it should be. So this is priced and scheduled around it: lock your rate now, and we time the build so it never competes with the opening. You give a short block of input up front; we handle the rest.
          </p>

          <table className="invest">
            <thead>
              <tr><th style={{ width: '52%' }}>Item</th><th style={{ width: '20%' }}>Frequency</th><th style={{ width: '28%', textAlign: 'right' }}>Price</th></tr>
            </thead>
            <tbody>
              <tr>
                <td className="item">Phase&nbsp;1 · Redesign + In-House Booking Build
                  <small>Full black-and-white redesign, barber-first booking across all 4 studios (replaces Booksy), Google reviews integration, owner dashboard, San Antonio-ready, 30-day post-launch support.</small>
                </td>
                <td className="freq">One-time</td>
                <td className="price">$4,500<small>$3,825 if you commit by Aug 19</small></td>
              </tr>
              <tr>
                <td className="item">Phase&nbsp;2 · Hosting &amp; Maintenance Retainer
                  <small>Keeps the site and booking live, integrations healthy, and covers minor tweaks. Does NOT include new features.</small>
                </td>
                <td className="freq">Monthly</td>
                <td className="price">$400/mo<small>3-mo min · cancel anytime after</small></td>
              </tr>
              <tr>
                <td className="item">New Features (when you want them)
                  <small>Loyalty, gift cards, product sales, SMS campaigns — each scoped and quoted flat-rate before any work begins.</small>
                </td>
                <td className="freq">Per scope</td>
                <td className="price">From $300<small>quoted before work starts</small></td>
              </tr>
              <tr className="total">
                <td className="item">Move by Aug 19 — 15% off Phase 1</td>
                <td className="freq">Locked-in rate</td>
                <td className="price">$3,825<small>was $4,500</small></td>
              </tr>
            </tbody>
          </table>

          <div className="callout">
            <div className="k">The 15% is yours if you move this month</div>
            <div className="v">Say the word by <strong style={{ color: '#fff' }}>August 19</strong> and Phase&nbsp;1 holds at <strong style={{ color: '#fff' }}>$3,825</strong> — even if you'd rather we don't start building until San Antonio is open. From there it stays light on you: a short kickoff, one review before launch, and <strong style={{ color: '#fff' }}>you stay as involved as you feel you need to be</strong>. Lock the rate now, choose the kickoff date later.</div>
          </div>

          <p className="body" style={{ marginTop: '18px' }}>
            <strong>Acceptance.</strong> No rush — this stands through <strong>November&nbsp;30</strong>, and with the opening on your plate we mean that. To hold the 15%, just reply <em>"approved"</em> by August&nbsp;19; we'll send the deposit and pencil in a kickoff for whenever you're ready. 50% starts the build, the balance is due at launch, and you're live within three weeks of kickoff. Fadebox owns the site, the code, and every bit of customer and booking data — export it any time.
          </p>

          <div className="sign">
            <div className="col">
              <div className="k">For THE LOST AND UNFOUNDS LLC.</div>
              <div className="line"></div>
              <div className="who">Joshua Greene</div>
              <div className="role">Founder · July 19, 2026</div>
            </div>
            <div className="col">
              <div className="k">For Fadebox Barbershop</div>
              <div className="line"></div>
              <div className="who">Eric Alderete</div>
              <div className="role">Owner · Date: ___________</div>
            </div>
          </div>

          <div className="runfoot"><div>Sharpest fades in Austin · Booked in house</div><div>Page 3 / 3</div></div>
        </section>
      </div>
    </>
  );
}
