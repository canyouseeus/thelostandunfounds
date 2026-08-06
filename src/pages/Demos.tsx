import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

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
  :root{
    --paper:#ffffff;
    --ink:#0a0a0a;
    --soft:#3a3a3a;
    --muted:#7a7a7a;
    --rule-soft:#d8d8d8;
    --pink:#E91E8C;
  }
  @page { size: Letter; margin: 0; }
  .dmx *{box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact;}
  .dmx{margin:0;padding:0;background:var(--paper);color:var(--ink);
    font-family:'Inter','Helvetica Neue',Arial,sans-serif;
    -webkit-font-smoothing:antialiased;min-height:100vh;}

  .dmx .page{width:100%;max-width:8.5in;margin:0 auto;padding:0.7in 0.75in 0.6in;}

  .dmx .eyebrow{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--muted);}
  .dmx h1{font-size:40px;line-height:1.02;letter-spacing:-.02em;margin:10px 0 0;
    text-transform:uppercase;font-weight:800;}
  .dmx .lede{font-size:15px;line-height:1.6;color:var(--soft);margin:16px 0 0;max-width:56ch;}
  .dmx .rule{height:2px;background:var(--ink);margin:26px 0;}

  .dmx .item{padding:26px 0;}
  .dmx .item + .item{border-top:1px solid var(--rule-soft);}
  .dmx .kind{font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);}
  .dmx .item h2{font-size:22px;font-weight:800;letter-spacing:-.015em;margin:7px 0 0;}
  .dmx .price{display:inline-block;margin-top:8px;font-size:10px;letter-spacing:.14em;
    text-transform:uppercase;font-weight:700;background:var(--ink);color:#fff;padding:5px 9px;}
  .dmx .blurb{font-size:13px;line-height:1.6;color:var(--soft);margin:11px 0 0;max-width:60ch;}

  .dmx .links{display:flex;flex-wrap:wrap;gap:9px;margin-top:15px;}
  .dmx .lk{display:block;text-decoration:none;color:#fff;background:var(--ink);
    padding:11px 13px;min-width:190px;}
  .dmx .lk .l{font-size:12.5px;font-weight:700;line-height:1.25;}
  .dmx .lk .n{font-size:10.5px;line-height:1.35;color:rgba(255,255,255,.7);margin-top:4px;}
  .dmx .lk.alt{background:var(--pink);}

  .dmx .foot{margin-top:34px;padding-top:16px;border-top:1px solid var(--rule-soft);
    display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;
    font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);}

  .dmx .note{font-size:11.5px;line-height:1.55;color:var(--muted);margin-top:12px;}

  @media (max-width:760px){
    .dmx .page{padding:28px 20px 40px;}
    .dmx h1{font-size:30px;}
    .dmx .lk{min-width:0;width:100%;}
  }
`;

export default function Demos() {
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

        <div className="page">
          <div className="eyebrow">The Lost+Unfounds</div>
          <h1>Live Demos</h1>
          <p className="lede">
            Everything below is real software you can press, not screenshots and not a
            walkthrough video. Open one, or send this whole page &mdash; every link here
            also works on its own.
          </p>

          <div className="rule" />

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
