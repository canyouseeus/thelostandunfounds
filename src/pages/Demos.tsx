import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import AffiliateBanner from '../components/affiliate/AffiliateBanner';
import { initAffiliateTracking } from '../utils/affiliate-tracking';

/* ============================================================
   THE LOST+UNFOUNDS — Demo index. Route: /demos

   Joshua: "I want to have the option to be able to do both: send a group or
   send them a la carte."

   So this page is a directory, not a container. Every demo listed here is its
   own working URL and always was — this adds one address that gathers them,
   it does not put them behind anything. Send /demos to somebody shopping
   around; send a single row's link to somebody who asked about one thing.

   ADDING A DEMO: append to DEMOS below. Each `links` entry is a route or an
   external URL, and each one has to stand alone, because that is the whole
   point of the page.
   ============================================================ */

type DemoLink = { label: string; href: string; external?: boolean; note?: string };
type Demo = {
  kind: string;
  title: string;
  blurb: string;
  price?: string;
  links: DemoLink[];
};

const DEMOS: Demo[] = [
  {
    kind: 'Website',
    title: 'The Lost+Unfounds',
    blurb:
      'Our own site, and the clearest example of the customer-facing build: a landing page that carries the work, with booking running inline on it — pick a service, pick a date, and the request lands without leaving the page or bouncing to a third-party scheduler.',
    links: [
      { label: 'The site', href: '/' },
    ],
  },
  {
    kind: 'Interactive kiosk',
    title: 'Flash Kiosk + Studio Dashboard',
    blurb:
      'A touchscreen on the shop wall showing the work, and the phone tool the shop uses to keep it current. An artist publishes from their phone and it is on the wall — no export, no sync step, nobody has to be at the shop. Both links below are the real software running, not a video.',
    price: 'Per project · from $2,500',
    links: [
      { label: 'Design brief (2 pages, prints to PDF)', href: '/kiosk-demo' },
      {
        label: 'The wall kiosk',
        href: 'https://flash-gallery-preview.vercel.app/',
        external: true,
        note: 'What the customer touches',
      },
      {
        label: 'The studio dashboard',
        href: 'https://kattitude-flash-dashboard.vercel.app/demo.html',
        external: true,
        note: 'Opens straight in — no sign-in. Upload something.',
      },
    ],
  },
  {
    kind: 'Website + owner dashboard',
    title: 'Kattitude Tattoo Studio',
    blurb:
      'Tattoo studio. Public site with the artist roster and flash browsing, plus the owner console behind it — bookings, artists, and the content that feeds the wall kiosk.',
    links: [
      { label: 'The website', href: '/kattitude-preview' },
      { label: 'The owner dashboard', href: '/kattitude-preview/dashboard' },
    ],
  },
  {
    kind: 'Website + owner dashboard',
    title: 'Fadebox Barbershop',
    blurb:
      'Barbershop redesign. Monochrome identity carried straight through from the site into the console, so the back office does not look like a different company than the front door.',
    links: [
      { label: 'The website', href: '/fadebox-preview' },
      { label: 'The owner dashboard', href: '/fadebox-preview/dashboard' },
      { label: 'The proposal', href: '/fadebox-preview/proposal', note: 'Prints to PDF' },
    ],
  },
  {
    kind: 'Website + owner dashboard',
    title: 'Silva Star Water Solutions',
    blurb:
      'Service business — grey water disposal, grease removal, event services. Site plus a console with job scheduling and webmail, for an operation that runs off dispatch rather than footfall.',
    links: [
      { label: 'The website', href: '/silva-star' },
      { label: 'The owner dashboard', href: '/silva-star/dashboard' },
      { label: 'The proposal', href: '/silva-star/proposal', note: 'Prints to PDF' },
    ],
  },
];

const css = `
  /* NOIR. The Lost+Unfounds' own identity, not a client's.
   * noir-design: background ALWAYS #000000, text #ffffff, NO BORDERS, NO
   * SHADOWS, and "separation comes from surface tone, never from an outline".
   * So every divider here is a change of surface, not a rule.
   *
   * The first build of this page used white paper and Kattitude pink — that is
   * the CLIENT's brand. A page selling our work has to be ours. */
  .dmx{
    --base:#000000;      /* page */
    --raised:#0a0a0a;    /* section chrome */
    --subtle:rgba(255,255,255,0.05);   /* cards, secondary buttons */
    --inter:rgba(255,255,255,0.10);    /* hover on a subtle surface */
    --ink:#ffffff;
    --dim:rgba(255,255,255,0.87);
    --mute:rgba(255,255,255,0.55);
  }
  .dmx *{box-sizing:border-box;}
  .dmx{margin:0;padding:0;min-height:100vh;
    background:var(--base);color:var(--ink);
    font-family:'Inter','Helvetica Neue',Arial,sans-serif;
    -webkit-font-smoothing:antialiased;}

  /* Masthead — the logo sits centered exactly as it does in <Layout>'s header,
     and it is the way back to the homepage from this page. /demos renders
     outside <Layout>, so without this there is no exit. */
  .dmx .mast{display:flex;justify-content:center;padding:22px 24px 0;}
  .dmx .mast a{display:block;transition:opacity .12s ease;}
  .dmx .mast a:hover{opacity:.7;}
  .dmx .mast img{height:84px;width:auto;display:block;}
  @media (max-width:760px){.dmx .mast img{height:63px;}}

  .dmx .page{width:100%;max-width:1040px;margin:0 auto;padding:40px 24px 72px;}

  .dmx .eyebrow{font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:var(--mute);}
  .dmx h1{font-size:clamp(38px,7vw,68px);line-height:0.98;letter-spacing:-.02em;
    margin:14px 0 0;text-transform:uppercase;font-weight:800;color:var(--ink);}
  .dmx .lede{font-size:16px;line-height:1.62;color:var(--dim);margin:20px 0 0;
    max-width:62ch;text-align:left;}

  /* Each demo is a raised surface on black. Tone separates them; there is no
     rule between them and no outline around them. */
  .dmx .item{background:var(--subtle);padding:30px 28px;margin-top:16px;border-radius:0;}
  .dmx .item:first-of-type{margin-top:40px;}
  .dmx .kind{font-size:9.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--mute);}
  .dmx .item h2{font-size:clamp(20px,3vw,27px);font-weight:800;letter-spacing:-.015em;
    margin:9px 0 0;text-transform:uppercase;color:var(--ink);}
  .dmx .price{display:inline-block;margin-top:12px;padding:6px 11px;
    font-size:10px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;
    background:var(--ink);color:#000;border-radius:0;}
  .dmx .blurb{font-size:14px;line-height:1.65;color:var(--dim);margin:14px 0 0;
    max-width:66ch;text-align:left;}

  .dmx .links{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px;}
  /* Primary = inverted, per the surface ladder. Secondary = white/10 on the
     raised surface, so it reads without an outline. */
  .dmx .lk{display:block;text-decoration:none;padding:13px 15px;min-width:210px;
    background:var(--inter);color:var(--ink);border-radius:0;
    transition:background .12s ease,color .12s ease;}
  .dmx .lk:hover{background:var(--ink);color:#000;}
  .dmx .lk.alt{background:var(--ink);color:#000;}
  .dmx .lk.alt:hover{background:var(--inter);color:var(--ink);}
  .dmx .lk .l{display:block;font-size:12.5px;font-weight:700;line-height:1.25;
    text-transform:uppercase;letter-spacing:.04em;}
  .dmx .lk .n{display:block;font-size:10.5px;line-height:1.4;margin-top:5px;opacity:.72;}

  .dmx .note{font-size:12px;line-height:1.6;color:var(--mute);margin-top:34px;
    max-width:70ch;text-align:left;}

  .dmx .foot{margin-top:20px;background:var(--raised);padding:18px 24px;
    display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;
    font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);}

  @media (max-width:760px){
    .dmx .page{padding:38px 18px 48px;}
    .dmx .item{padding:22px 18px;}
    .dmx .lk{min-width:0;width:100%;}
  }
`;

export default function Demos() {
  /* Affiliates hand this page out as their pitch asset, so ?ref=CODE has to
     stick here. Everywhere else that happens in <Layout>, and /demos renders
     outside it — without this the referral tag on a shared /demos?ref=CODE
     link is silently dropped and the affiliate never gets credited. The cookie
     it sets is path=/, so the tag survives the click through to a demo, the
     shop, or a booking. */
  useEffect(() => {
    initAffiliateTracking();
  }, []);

  return (
    <>
      <Helmet>
        <title>THE LOST+UNFOUNDS — Live Demos</title>
        <meta
          name="description"
          content="Working demos of the interactive kiosk, business websites and owner dashboards built by The Lost+Unfounds. Real software, running."
        />
        {/* Indexable, on Joshua's call — this is a sales page and being found
            in search is the point. The individual CLIENT previews it links to
            keep their own robots rules; nothing here changes those. */}
        <meta name="robots" content="index,follow" />
      </Helmet>

      <div className="dmx">
        <style>{css}</style>

        {/* Affiliate program banner — the same strip the homepage runs above its
            nav. /demos renders outside <Layout>, so it has to be placed here
            explicitly; noMargin keeps it flush to the top of the page. */}
        <AffiliateBanner noMargin />

        <div className="mast">
          <Link to="/" aria-label="THE LOST+UNFOUNDS — home">
            <img src="/logo.png" alt="THE LOST+UNFOUNDS" />
          </Link>
        </div>

        <div className="page">
          <div className="eyebrow">The Lost+Unfounds</div>
          <h1>Live Demos</h1>
          <p className="lede">
            Everything below is real software you can press, not screenshots and not a
            walkthrough video. Open one, or send this whole page &mdash; every link here
            also works on its own.
          </p>

          {DEMOS.map((d) => (
            <div className="item" key={d.title}>
              <div className="kind">{d.kind}</div>
              <h2>{d.title}</h2>
              {d.price && <div className="price">{d.price}</div>}
              <p className="blurb">{d.blurb}</p>

              <div className="links">
                {d.links.map((l, i) =>
                  l.external ? (
                    <a
                      className={i === 0 ? 'lk alt' : 'lk'}
                      key={l.href}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="l">{l.label} &nbsp;&rarr;</span>
                      {l.note && <span className="n">{l.note}</span>}
                    </a>
                  ) : (
                    <Link className={i === 0 ? 'lk alt' : 'lk'} key={l.href} to={l.href}>
                      <span className="l">{l.label} &nbsp;&rarr;</span>
                      {l.note && <span className="n">{l.note}</span>}
                    </Link>
                  )
                )}
              </div>
            </div>
          ))}

          <p className="note">
            The kiosk and dashboard demos run against sample content in your own browser
            tab &mdash; nothing you press is saved anywhere, and a refresh starts them
            over. Client sites shown here are published with permission.
          </p>

          <div className="foot">
            <span>thelostandunfounds.com/demos</span>
            <span>media@thelostandunfounds.com</span>
          </div>
        </div>
      </div>
    </>
  );
}
