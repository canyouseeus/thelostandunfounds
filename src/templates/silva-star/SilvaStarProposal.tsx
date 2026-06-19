import { Helmet } from 'react-helmet-async';

const css = `
  :root{
    --paper:#ffffff;
    --ink:#0a0a0a;
    --soft:#3a3a3a;
    --muted:#7a7a7a;
    --rule:#1a1a1a;
    --rule-soft:#d8d8d8;
  }
  @page { size: Letter; margin: 0; }
  .proposal-root *{box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact;}
  .proposal-root{margin:0;padding:0;background:var(--paper);color:var(--ink);
    font-family:'Inter','Helvetica Neue',Arial,sans-serif;
    -webkit-font-smoothing:antialiased;}

  .proposal-root .page{
    width:100%; max-width:8.5in; min-height:11in;
    padding:0.85in 0.95in;
    background:var(--paper);
    position:relative;
    page-break-after:always;
    display:flex; flex-direction:column;
    overflow:hidden;
    margin:0 auto;
  }
  @media print{
    .proposal-root .page{width:8.5in; height:11in; margin:0;}
  }
  .proposal-root .page:last-child{page-break-after:auto;}

  .proposal-root .runhead{
    display:flex; justify-content:space-between; align-items:center;
    font-size:8.5px; letter-spacing:.28em; text-transform:uppercase;
    color:var(--ink); font-weight:600;
  }
  .proposal-root .runhead .sep{letter-spacing:.4em;}
  .proposal-root .runhead .left{display:flex; gap:24px;}

  .proposal-root .cover-body{
    flex:1; display:flex; flex-direction:column; align-items:center;
    text-align:center; padding-top:0.55in;
  }
  .proposal-root .cover-logo{
    width:160px; height:160px; margin-bottom:24px;
    display:flex; align-items:center; justify-content:center;
  }
  .proposal-root .cover-logo img{
    width:100%; height:100%; object-fit:contain;
    filter:invert(1);
  }
  .proposal-root .cover-brand{
    font-size:13px; letter-spacing:.42em; text-transform:uppercase;
    font-weight:700; margin-bottom:4px;
  }
  .proposal-root .cover-tag{
    font-size:10px; letter-spacing:.32em; text-transform:uppercase;
    color:var(--muted); font-weight:500; margin-bottom:52px;
  }
  .proposal-root .cover-label{
    font-size:9px; letter-spacing:.36em; text-transform:uppercase;
    color:var(--muted); font-weight:600; margin-bottom:8px;
  }
  .proposal-root .cover-h1{
    font-size:38px; line-height:1.08; letter-spacing:.005em;
    font-weight:800; text-transform:uppercase; margin:0 0 6px;
  }
  .proposal-root .cover-h1-sub{
    font-size:13px; color:var(--soft); margin:0 0 48px;
    font-weight:400;
  }

  .proposal-root .cover-grid{
    display:grid; grid-template-columns:1fr 1fr; gap:36px;
    text-align:left; width:100%; max-width:520px; margin-bottom:36px;
  }
  .proposal-root .cover-grid .field .k{
    font-size:9px; letter-spacing:.28em; text-transform:uppercase;
    color:var(--muted); font-weight:600; margin-bottom:6px;
  }
  .proposal-root .cover-grid .field .v{
    font-size:12px; line-height:1.65; font-weight:500;
  }
  .proposal-root .cover-grid .field .v .lite{color:var(--soft); font-weight:400;}

  .proposal-root .cover-dates{
    display:flex; gap:48px; margin-top:auto; margin-bottom:8px;
  }
  .proposal-root .cover-dates .d{
    font-size:9px; letter-spacing:.22em; text-transform:uppercase;
    color:var(--muted); font-weight:600;
  }
  .proposal-root .cover-dates .d span{
    display:block; font-size:12px; letter-spacing:.02em;
    color:var(--ink); font-weight:600; margin-top:3px;
    text-transform:none;
  }

  .proposal-root .runfoot{
    display:flex; justify-content:space-between; align-items:center;
    font-size:8px; letter-spacing:.3em; text-transform:uppercase;
    color:var(--muted); font-weight:500;
    margin-top:auto; padding-top:14px;
  }

  .proposal-root .pagehead{
    margin-bottom:18px;
  }
  .proposal-root .pagehead .sect{
    font-size:10px; letter-spacing:.34em; text-transform:uppercase;
    font-weight:700; margin-bottom:14px;
  }
  .proposal-root .pagehead h2{
    font-size:32px; line-height:1.1; letter-spacing:.005em;
    font-weight:700; text-transform:uppercase; margin:0;
    max-width:18ch;
  }

  .proposal-root p.lede{
    font-size:13px; line-height:1.7; color:var(--ink);
    max-width:62ch; margin:0 0 22px;
  }
  .proposal-root p.body{
    font-size:12.5px; line-height:1.7; color:var(--soft);
    max-width:62ch; margin:0 0 16px;
  }

  .proposal-root .rule{height:1px; background:var(--rule); border:0; margin:14px 0 22px;}
  .proposal-root .rule-soft{height:1px; background:var(--rule-soft); border:0; margin:14px 0 22px;}

  .proposal-root .subhead{
    font-size:10px; letter-spacing:.32em; text-transform:uppercase;
    font-weight:700; margin:6px 0 14px;
  }

  .proposal-root ul.list{list-style:none; padding:0; margin:0 0 18px;}
  .proposal-root ul.list li{
    position:relative; padding-left:18px; margin-bottom:9px;
    font-size:12.5px; line-height:1.65; color:var(--ink);
  }
  .proposal-root ul.list li::before{
    content:"■"; position:absolute; left:0; top:0;
    font-size:8px; color:var(--ink); line-height:1.95;
  }
  .proposal-root ul.list li .lite{color:var(--soft);}

  .proposal-root .invest{
    width:100%; border-collapse:collapse;
    margin-top:8px; margin-bottom:22px;
  }
  .proposal-root .invest th, .proposal-root .invest td{
    text-align:left; padding:14px 0;
    border-bottom:1px solid var(--rule-soft);
    font-size:11.5px; vertical-align:top;
  }
  .proposal-root .invest thead th{
    font-size:9px; letter-spacing:.28em; text-transform:uppercase;
    font-weight:700; color:var(--muted); padding-bottom:10px;
    border-bottom:1px solid var(--rule);
  }
  .proposal-root .invest .item{font-weight:600; line-height:1.5;}
  .proposal-root .invest .item small{display:block; font-weight:400; color:var(--soft); margin-top:3px; font-size:11px; line-height:1.55;}
  .proposal-root .invest .freq{color:var(--soft); font-size:11px;}
  .proposal-root .invest .price{text-align:right; font-weight:700; font-size:13px;}
  .proposal-root .invest .price small{display:block; font-weight:400; color:var(--muted); font-size:10px; margin-top:2px;}

  .proposal-root .callout{
    background:#f5f5f5; padding:16px 20px;
  }
  .proposal-root .callout .k{
    font-size:9.5px; letter-spacing:.26em; text-transform:uppercase;
    font-weight:700; margin-bottom:8px;
  }
  .proposal-root .callout .v{
    font-size:11.5px; line-height:1.7; color:var(--soft);
  }

  .proposal-root .sign{
    display:grid; grid-template-columns:1fr 1fr; gap:40px;
    margin-top:auto; padding-top:20px;
  }
  .proposal-root .sign .col .k{
    font-size:9px; letter-spacing:.24em; text-transform:uppercase;
    color:var(--muted); font-weight:600; margin-bottom:28px;
  }
  .proposal-root .sign .col .line{
    height:1px; background:var(--rule); margin-bottom:8px;
  }
  .proposal-root .sign .col .who{
    font-size:12px; font-weight:600;
  }
  .proposal-root .sign .col .role{
    font-size:10px; color:var(--muted); margin-top:2px;
  }
`;

export default function SilvaStarProposal() {
  return (
    <>
      <Helmet>
        <title>THE LOST+UNFOUNDS — Proposal for Silva Star Water Solutions</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{css}</style>
      </Helmet>

      <div className="proposal-root" style={{ background: '#ffffff', minHeight: '100vh' }}>

        {/* PAGE 1 — COVER */}
        <section className="page">
          <div className="runhead">
            <div className="left">
              <span>THE LOST+UNFOUNDS</span>
              <span className="sep">·</span>
              <span>Silva Star Water Solutions Proposal</span>
            </div>
            <div>Page 1 / 3</div>
          </div>

          <div className="cover-body">
            <div className="cover-logo" aria-label="THE LOST+UNFOUNDS">
              <img src="https://www.thelostandunfounds.com/logo.png" alt="THE LOST+UNFOUNDS" />
            </div>
            <div className="cover-brand">THE LOST+UNFOUNDS</div>
            <div className="cover-tag">Can you see us?</div>

            <div className="cover-label">Proposal</div>
            <h1 className="cover-h1">Website, Dashboard<br />&amp; Growth Platform</h1>
            <p className="cover-h1-sub">Prepared for Silva Star Water Solutions</p>

            <div className="cover-grid">
              <div className="field">
                <div className="k">Prepared by</div>
                <div className="v">
                  Joshua Greene<br />
                  <span className="lite">THE LOST AND UNFOUNDS LLC.</span><br />
                  <span className="lite">business@thelostandunfounds.com</span>
                </div>
              </div>
              <div className="field">
                <div className="k">Prepared for</div>
                <div className="v">
                  Daniel Silva<br />
                  <span className="lite">Silva Star Water Solutions</span><br />
                  <span className="lite">danielsilvaatx@gmail.com&nbsp;·&nbsp;(512) 967-2787</span>
                </div>
              </div>
            </div>

            <div className="cover-dates">
              <div className="d">Proposal Date<span>June 18, 2026</span></div>
              <div className="d">Valid Through<span>July 31, 2026</span></div>
            </div>
          </div>

          <div className="runfoot">
            <div>YOUR FLEET. ONE DASHBOARD.</div>
            <div>Page 1 / 3</div>
          </div>
        </section>

        {/* PAGE 2 — OPPORTUNITY + WHAT YOU GET */}
        <section className="page">
          <div className="runhead">
            <div className="left">
              <span>THE LOST+UNFOUNDS</span>
              <span className="sep">·</span>
              <span>Silva Star Water Solutions Proposal</span>
            </div>
            <div>Page 2 / 3</div>
          </div>

          <div className="pagehead">
            <div className="sect">01 · The Opportunity</div>
            <h2>You run the trucks. The site brings the work.</h2>
          </div>

          <p className="lede">
            Silva Star Water Solutions has built a reputation in Austin servicing food trucks and events with reliable grey water disposal. But right now, every job comes from word of mouth, and there is zero web presence. No website means no search visibility, no online booking, and no way for new customers to find you.
          </p>
          <p className="body">
            This proposal lays out a complete digital platform: a professional website that turns visitors into bookings, a service dashboard that tracks every job, invoice, and dollar owed, and a built-in referral program that rewards the people already sending you business.
          </p>

          <hr className="rule" />

          <div className="subhead">02 · What you get</div>

          <ul className="list">
            <li><strong>A professional one-page website</strong> — <span className="lite">custom dark-mode design, mobile-first, built for Austin service businesses. Hero, services, service area, booking CTA, testimonials.</span></li>
            <li><strong>Online booking system</strong> — <span className="lite">customers request grey water pickup or grease service with date, location, truck count, and event details. Every request hits your dashboard instantly.</span></li>
            <li><strong>Service management dashboard</strong> — <span className="lite">track every job from scheduled to completed to paid. See today's route, outstanding invoices, repeat customers, revenue trends, fleet status.</span></li>
            <li><strong>Invoicing with payment tracking</strong> — <span className="lite">create and send invoices, track who has paid and who has not. Stripe integration so customers can pay online. Solves the Square visibility problem.</span></li>
            <li><strong>Built-in affiliate/referral program</strong> — <span className="lite">food truck operators and friends refer customers, get a commission when the job is completed and paid. Automatic tracking.</span></li>
            <li><strong>Click-to-call everywhere</strong> — <span className="lite">(512) 967-2787 and danielsilvaatx@gmail.com prominently placed across the site.</span></li>
          </ul>

          <div className="subhead">Also included</div>
          <ul className="list">
            <li>Platform console with webmail, newsletter, customer management, reports, and settings.</li>
            <li>Deployed to Vercel with a custom subdomain — <span className="lite">your own domain when ready.</span></li>
            <li>Instant email notification on every new booking request.</li>
            <li>On-page SEO baseline — <span className="lite">meta tags, OpenGraph, optimized for "Austin grey water disposal" and related searches.</span></li>
            <li>30 days of post-launch support.</li>
          </ul>

          <div className="runfoot">
            <div>YOUR FLEET. ONE DASHBOARD.</div>
            <div>Page 2 / 3</div>
          </div>
        </section>

        {/* PAGE 3 — INVESTMENT + ACCEPTANCE */}
        <section className="page">
          <div className="runhead">
            <div className="left">
              <span>THE LOST+UNFOUNDS</span>
              <span className="sep">·</span>
              <span>Silva Star Water Solutions Proposal</span>
            </div>
            <div>Page 3 / 3</div>
          </div>

          <div className="pagehead">
            <div className="sect">03 · Investment &amp; Next Steps</div>
            <h2>Flat rates. No surprises.</h2>
          </div>

          <p className="lede">
            The build is a flat one-time fee. The retainer covers maintenance and minor tweaks only — not new modules. New features are scoped and quoted flat-rate before any work begins, so you always know the cost before we start.
          </p>

          <table className="invest">
            <thead>
              <tr>
                <th style={{ width: '52%' }}>Item</th>
                <th style={{ width: '20%' }}>Frequency</th>
                <th style={{ width: '28%', textAlign: 'right' }}>Price</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="item">Phase&nbsp;1 · Website + Dashboard Build
                  <small>One-page site, booking system, service dashboard, invoicing, referral program, Stripe integration, 30-day support.</small>
                </td>
                <td className="freq">One-time</td>
                <td className="price">$2,000</td>
              </tr>
              <tr>
                <td className="item">Phase&nbsp;2 · Maintenance Retainer
                  <small>Keeps integrations alive, fixes anything that breaks, minor tweaks. Does NOT include new features.</small>
                </td>
                <td className="freq">Monthly</td>
                <td className="price">$300/mo<small>3-mo min · cancel anytime after</small></td>
              </tr>
              <tr>
                <td className="item">New Features (when you want them)
                  <small>Each new module is scoped and quoted flat-rate before any work begins. No surprise invoices.</small>
                </td>
                <td className="freq">Per scope</td>
                <td className="price">From $300<small>quoted before work starts</small></td>
              </tr>
            </tbody>
          </table>

          <div className="callout">
            <div className="k">How it works · aligned incentives</div>
            <div className="v">The $300 retainer keeps the lights on. Want something new? We scope it together, agree on a flat price, then build it. You know the cost before we start.</div>
          </div>

          <div className="callout" style={{ marginTop: '18px' }}>
            <div className="k">Timeline &amp; Payment Terms</div>
            <div className="v"><strong>$1,000 deposit due to begin work. Balance of $1,000 due on launch day.</strong> Retainer billed monthly starting on launch date. <strong>Site goes live within 3 weeks</strong> of deposit clearing.</div>
          </div>

          <p className="body" style={{ marginTop: '18px' }}>
            <strong>Acceptance.</strong> Reply by email or text with <em>"approved"</em> to receive the deposit invoice. Silva Star Water Solutions owns the website, the source code, and all customer data — full export available any time.
          </p>

          <div className="sign">
            <div className="col">
              <div className="k">For THE LOST AND UNFOUNDS LLC.</div>
              <div className="line"></div>
              <div className="who">Joshua Greene</div>
              <div className="role">Founder · June 18, 2026</div>
            </div>
            <div className="col">
              <div className="k">For Silva Star Water Solutions</div>
              <div className="line"></div>
              <div className="who">Daniel Silva</div>
              <div className="role">Owner · Date: ___________</div>
            </div>
          </div>

          <div className="runfoot">
            <div>YOUR FLEET. ONE DASHBOARD.</div>
            <div>Page 3 / 3</div>
          </div>
        </section>

      </div>
    </>
  );
}
