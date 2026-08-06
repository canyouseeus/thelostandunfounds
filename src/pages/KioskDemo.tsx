import { Helmet } from 'react-helmet-async';

/* ============================================================
   THE LOST+UNFOUNDS — Interactive Kiosk Build
   Public demo + design brief. Route: /kiosk-demo

   WHY THIS PAGE EXISTS
   Joshua: "I just want to be able to send it to my homies and be like, yo,
   hey, check this out, or send it to a potential client."

   So it does two jobs at once. The top half is a launcher — two buttons into
   software that is genuinely running, not a video and not a mockup. The
   bottom half is the design brief, one section per tab, laid out at Letter
   size so Cmd-P saves a PDF a client can forward to a partner.

   THE DEMOS ARE THE REAL APPS. Neither is a rebuild:
     - the dashboard is the studio's actual dashboard, served against an
       in-memory backend (dashboard/demo-backend.js in the kiosk repo) so
       every button works and nothing can reach live data
     - the kiosk is the actual wall app running on its seed catalog

   NOINDEX, deliberately. This shows a real client's studio, their roster and
   their handles. Joshua sends this link to people he chooses; it should not
   arrive at strangers through a search result. Remove the robots tag if that
   judgement changes.
   ============================================================ */

const DASHBOARD_DEMO = 'https://kattitude-flash-dashboard.vercel.app/demo.html';
const KIOSK_DEMO = 'https://flash-gallery-preview.vercel.app/';

type Brief = {
  tab: string;
  who: string;
  line: string;
  detail: string;
};

/* One entry per tab in the shipped dashboard, in the order they appear in it.
   `who` matters more than it looks: the whole design rests on artists and the
   owner sharing one tool without sharing one job. */
const TABS: Brief[] = [
  {
    tab: 'Upload',
    who: 'Every artist',
    line: 'Drop a batch of flash in, tag it all at once.',
    detail:
      'Multi-select from the camera roll, then tag the whole batch together rather than one file at a time. Sizes are enforced on the way in — 2048×2048 for a single design, 2160×3840 for a full sheet — and an off-size file is refused with the exact size it needed. Nothing is silently resized, because cropping somebody else’s artwork is not the software’s call.',
  },
  {
    tab: 'My Designs',
    who: 'Every artist',
    line: 'Everything you have uploaded, and what still needs finishing.',
    detail:
      'Each design carries its own state — draft, published, needs a category. An artist sees only their own work here; the owner sees the whole shop. Publishing is one tap, and it is what puts a piece on the wall.',
  },
  {
    tab: 'Requests',
    who: 'Artists ask, the owner answers',
    line: 'One tab, two jobs — deliberately not split in half.',
    detail:
      'An artist asks for a tag they actually want to use: a theme like “summertime”, a subject like “snakes”, a drawing style. The owner approves it, merges it into one the shop already has, or rejects it with a note so the artist knows why. Approval is what keeps the kiosk from ending up with three spellings of the same thing.',
  },
  {
    tab: 'Artists',
    who: 'Owner only',
    line: 'The roster, and the only place an invite comes from.',
    detail:
      'Adding an artist’s email is what sends their sign-in link — there is no separate invite screen to forget about. Seniority sets the order they appear on the kiosk, and an artist can be hidden from the wall without deleting anything they have made.',
  },
  {
    tab: 'Categories',
    who: 'Owner only',
    line: 'The shop’s vocabulary, kept deliberately short.',
    detail:
      'Styles and subjects, ordered for the kiosk. Matching ignores case and punctuation, so “Fine Line”, “fine-line” and “fineline” cannot become three different filters for a customer to choose between.',
  },
  {
    tab: 'Flash Sales',
    who: 'Owner only',
    line: 'A dated event with its own price levels and photos.',
    detail:
      'Friday the 13th, a flash day, a guest spot. Price tiers rather than one number, because a small piece and a back piece are not the same sale. A sale is created unpublished and never goes live the instant it is made.',
  },
  {
    tab: 'Review',
    who: 'Owner only',
    line: 'An optional gate between “uploaded” and “on the wall”.',
    detail:
      'Off by default — artists publish straight to the kiosk, which is what a shop that trusts its artists wants. One setting turns it into a queue where nothing reaches the wall until the owner has seen it. No migration, no rebuild; the column is already there.',
  },
];

const css = `
  :root{
    --paper:#ffffff;
    --ink:#0a0a0a;
    --soft:#3a3a3a;
    --muted:#7a7a7a;
    --rule:#0a0a0a;
    --rule-soft:#d8d8d8;
    --pink:#E91E8C;
  }
  @page { size: Letter; margin: 0; }
  .kdemo *{box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact;}
  .kdemo{margin:0;padding:0;background:var(--paper);color:var(--ink);
    font-family:'Inter','Helvetica Neue',Arial,sans-serif;
    -webkit-font-smoothing:antialiased;}

  .kdemo .page{
    width:100%; max-width:8.5in; min-height:11in;
    margin:0 auto; padding:0.7in 0.75in 0.6in;
    background:var(--paper); position:relative;
  }

  .kdemo .eyebrow{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--muted);}
  .kdemo h1{font-size:40px;line-height:1.02;letter-spacing:-.02em;margin:10px 0 0;text-transform:uppercase;font-weight:800;}
  .kdemo h2{font-size:13px;letter-spacing:.18em;text-transform:uppercase;margin:0 0 14px;font-weight:700;}
  .kdemo .lede{font-size:15px;line-height:1.6;color:var(--soft);margin:16px 0 0;max-width:52ch;}
  .kdemo .rule{height:2px;background:var(--rule);margin:26px 0;}
  .kdemo .rule-soft{height:1px;background:var(--rule-soft);margin:18px 0;}

  /* ── Launcher ───────────────────────────────────────────── */
  .kdemo .demos{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:24px 0 0;}
  .kdemo .demo{
    display:block;text-decoration:none;color:inherit;
    background:#0a0a0a;color:#fff;padding:22px 20px;
  }
  .kdemo .demo .k{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.6);}
  .kdemo .demo .t{font-size:20px;font-weight:800;margin:8px 0 6px;letter-spacing:-.01em;}
  .kdemo .demo .d{font-size:12.5px;line-height:1.5;color:rgba(255,255,255,.78);}
  .kdemo .demo .go{display:inline-block;margin-top:14px;font-size:11px;letter-spacing:.14em;
    text-transform:uppercase;font-weight:700;color:#fff;background:var(--pink);padding:8px 12px;}

  /* ── Brief table ────────────────────────────────────────── */
  .kdemo .brief{margin-top:6px;}
  .kdemo .row{display:grid;grid-template-columns:1.35in 1fr;gap:16px;padding:14px 0;}
  .kdemo .row + .row{border-top:1px solid var(--rule-soft);}
  .kdemo .row .tab{font-size:14px;font-weight:800;letter-spacing:-.01em;}
  .kdemo .row .who{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-top:5px;}
  .kdemo .row .line{font-size:13.5px;font-weight:700;margin:0 0 5px;}
  .kdemo .row .detail{font-size:12.5px;line-height:1.55;color:var(--soft);margin:0;}

  .kdemo .grid2{display:grid;grid-template-columns:1fr 1fr;gap:22px;}
  .kdemo .spec{font-size:12.5px;line-height:1.6;color:var(--soft);margin:0;}
  .kdemo .spec b{color:var(--ink);}
  .kdemo ul{margin:8px 0 0;padding-left:16px;}
  .kdemo li{font-size:12.5px;line-height:1.6;color:var(--soft);margin-bottom:5px;}

  .kdemo .price{display:flex;align-items:baseline;gap:12px;margin-top:6px;}
  .kdemo .price .n{font-size:34px;font-weight:800;letter-spacing:-.02em;}
  .kdemo .price .u{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);}

  .kdemo .foot{position:absolute;left:0.75in;right:0.75in;bottom:0.42in;
    display:flex;justify-content:space-between;font-size:9.5px;letter-spacing:.12em;
    text-transform:uppercase;color:var(--muted);}

  .kdemo .note{font-size:11.5px;line-height:1.55;color:var(--muted);margin-top:10px;}

  @media (max-width:760px){
    .kdemo .page{padding:28px 20px 54px;min-height:0;}
    .kdemo h1{font-size:30px;}
    .kdemo .demos,.kdemo .grid2{grid-template-columns:1fr;}
    .kdemo .row{grid-template-columns:1fr;gap:6px;}
    .kdemo .foot{position:static;margin-top:26px;flex-direction:column;gap:4px;}
  }

  @media print{
    .kdemo .page{margin:0;padding:0.7in 0.75in 0.6in;page-break-after:always;}
    .kdemo .page:last-child{page-break-after:auto;}
    .kdemo .noprint{display:none !important;}
  }
`;

export default function KioskDemo() {
  return (
    <>
      <Helmet>
        <title>THE LOST+UNFOUNDS — Interactive Kiosk Build, Live Demo</title>
        <meta
          name="description"
          content="A working demo of the interactive flash kiosk and the studio dashboard behind it. Real software, running — not a mockup."
        />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="kdemo">
        <style>{css}</style>

        {/* ── Page 1 — launcher ──────────────────────────────── */}
        <section className="page">
          <div className="eyebrow">The Lost+Unfounds · Service Demo</div>
          <h1>Interactive Kiosk Build</h1>
          <p className="lede">
            A touchscreen on the wall that shows the shop&rsquo;s work, and the tool the
            shop uses to keep it current. Both halves below are the real software,
            running right now &mdash; not a video, not a prototype. Press anything you like.
          </p>

          <div className="demos">
            <a className="demo" href={KIOSK_DEMO} target="_blank" rel="noopener noreferrer">
              <div className="k">What the customer sees</div>
              <div className="t">The Wall Kiosk</div>
              <div className="d">
                The touchscreen in the shop. Browse flash by artist or category, pinch
                into any piece, and scan an artist&rsquo;s code to land on their Instagram.
                Left alone, it falls into an attract loop.
              </div>
              <span className="go">Open the kiosk →</span>
            </a>

            <a className="demo" href={DASHBOARD_DEMO} target="_blank" rel="noopener noreferrer">
              <div className="k">What the shop uses</div>
              <div className="t">The Studio Dashboard</div>
              <div className="d">
                Opens straight in as the studio owner &mdash; no sign-in, no link to wait
                for. The walkthrough runs on first open. Upload a file from your own
                phone and watch it appear.
              </div>
              <span className="go">Open the dashboard →</span>
            </a>
          </div>

          <p className="note noprint">
            The dashboard demo runs entirely inside your browser tab. Nothing you do is
            saved and nothing reaches a live database &mdash; refresh and it starts over.
            Artist names and handles are the studio&rsquo;s real ones so the QR codes resolve;
            no email addresses or phone numbers appear anywhere in it.
          </p>

          <div className="rule" />

          <h2>What it is</h2>
          <div className="grid2">
            <p className="spec">
              <b>A wall panel, and a phone.</b> The kiosk runs full-screen on a
              touchscreen in the shop, authored at a fixed 1080&times;1920 so the
              composition is identical on every panel. The dashboard is an ordinary
              mobile web app the artists use between clients &mdash; nothing to install,
              nothing to log into twice.
            </p>
            <p className="spec">
              <b>One catalog underneath both.</b> An artist publishes a design on their
              phone and it is on the wall. There is no export, no sync step, and nobody
              has to be at the shop to update the screen.
            </p>
          </div>

          <div className="foot">
            <span>The Lost+Unfounds</span>
            <span>Interactive Kiosk Build</span>
            <span>Page 1 / 2</span>
          </div>
        </section>

        {/* ── Page 2 — the brief ─────────────────────────────── */}
        <section className="page">
          <div className="eyebrow">Design Brief</div>
          <h1>Tab by Tab</h1>
          <p className="lede">
            Seven screens. Three belong to everybody, four to whoever runs the shop.
            The split is the whole design: one tool, two jobs.
          </p>

          <div className="rule" />

          <div className="brief">
            {TABS.map((t) => (
              <div className="row" key={t.tab}>
                <div>
                  <div className="tab">{t.tab}</div>
                  <div className="who">{t.who}</div>
                </div>
                <div>
                  <p className="line">{t.line}</p>
                  <p className="detail">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rule" />

          <div className="grid2">
            <div>
              <h2>Included</h2>
              <ul>
                <li>Kiosk software, authored to the panel and running full-screen</li>
                <li>Studio dashboard for the whole roster, on any phone</li>
                <li>Passwordless sign-in &mdash; a link, never a password to lose</li>
                <li>Per-artist QR codes straight to their Instagram</li>
                <li>Built-in walkthrough, so nobody has to be trained twice</li>
                <li>Attract loop for when the shop is quiet</li>
                <li>Setup on your hardware, and the handover to run it</li>
              </ul>
            </div>
            <div>
              <h2>Investment</h2>
              <div className="price">
                <span className="n">$2,500</span>
                <span className="u">one time · software</span>
              </div>
              <p className="note">
                Hardware is billed separately and bought at cost &mdash; the panel, the
                mount and the machine behind it are yours, not a rental. Ongoing hosting
                is minimal and quoted with the build.
              </p>
              <h2 style={{ marginTop: 22 }}>Next</h2>
              <p className="spec">
                Press both demos. If the shape is right, the build is scoped against
                your roster, your categories and your wall &mdash; nothing here is
                template work.
              </p>
            </div>
          </div>

          <div className="foot">
            <span>thelostandunfounds.com</span>
            <span>media@thelostandunfounds.com</span>
            <span>Page 2 / 2</span>
          </div>
        </section>
      </div>
    </>
  );
}
