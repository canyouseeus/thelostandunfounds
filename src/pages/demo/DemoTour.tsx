/* ============================================================
   DEMO SANDBOX — customer-site tour. Route: /demo/tour

   WHY THIS EXISTS. The demo index used to send prospects to `/` — the live
   site. That is not a demo: the visitor lands in the real application, with a
   real session (an admin who clicked it got their own admin build), a real
   checkout, and real sign-in. Joshua: "There's still an ability for people to
   purchase and everything through that demo, and that's not what I want at
   all... I would rather, for the demo version of my website, just have a
   tutorial section."

   So this is a walkthrough, not a doorway. Every screen below is drawn here,
   in this file, out of invented data. Nothing on this page mounts a real page
   component, reads the session, or can reach the cart. There is no route out
   of the sandbox except the deliberate one in the shared chrome.

   NOIR: black ground, surface-tone separation, square corners, uppercase
   headings, body copy text-left.
   ============================================================ */
import { useMemo, useState } from 'react';
import {
  HomeIcon, CalendarIcon, PhotoIcon, ShoppingBagIcon, BookOpenIcon,
  EnvelopeIcon, LinkIcon, CloudArrowDownIcon, ArrowLeftIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { DemoHead, DemoShell, Panel, Eyebrow } from './DemoChrome';
import {
  person, people, shortName, pick, rint, rfloat, sample, money2,
  SERVICES, PRODUCTS, GALLERY_SETS, ARTICLES, CITIES, soonDate, clockTime,
} from './demo-data';

/* --------------------------- mock screen pieces --------------------------- */
/* These are pictures of the UI, not the UI. Buttons here are <div>s and spans
   on purpose — there is nothing to press, so there is nothing to reach. */

function FakeButton({ children, invert = false }: { children: React.ReactNode; invert?: boolean }) {
  return (
    <span
      className={
        'inline-block px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] ' +
        (invert ? 'bg-white text-black' : 'bg-white/10 text-white/70')
      }
      style={{ borderRadius: 0 }}
    >
      {children}
    </span>
  );
}

function FakeField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35 text-left">{label}</div>
      <div className="mt-1 bg-white/5 px-3 py-2 text-[12px] text-white/70 text-left" style={{ borderRadius: 0 }}>
        {value}
      </div>
    </div>
  );
}

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0a0a0a]" style={{ borderRadius: 0 }}>
      <div className="px-4 py-2 bg-white/5">
        <span className="text-[9px] font-black uppercase tracking-[0.24em] text-white/40">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Tile({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="bg-white/5 p-3" style={{ borderRadius: 0 }}>
      <div className="aspect-[4/3] bg-white/10" style={{ borderRadius: 0 }} />
      <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/75 truncate text-left">{label}</div>
      {sub && <div className="text-[10px] text-white/35 text-left">{sub}</div>}
    </div>
  );
}

/* --------------------------------- stops ---------------------------------- */

function HomeScreen() {
  const posts = useMemo(() => sample(ARTICLES, 3), []);
  return (
    <Frame title="thelostandunfounds.com">
      <div className="text-center">
        <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/35">The Lost+Unfounds</div>
        <div className="mt-3 text-2xl sm:text-3xl font-black uppercase tracking-tight">Photography, Words, and the Archive</div>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <FakeButton invert>Book a session</FakeButton>
        <FakeButton>Gallery</FakeButton>
        <FakeButton>Shop</FakeButton>
        <FakeButton>The Lost Archives</FakeButton>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {posts.map((p) => <Tile key={p} label={p} sub="The Lost Archives" />)}
      </div>
    </Frame>
  );
}

function BookingScreen() {
  const d = useMemo(
    () => ({ service: pick(SERVICES), date: soonDate(), time: clockTime(), city: pick(CITIES), p: person(), price: rint(250, 1800) }),
    []
  );
  return (
    <Frame title="Booking — runs inline on the page">
      <div className="grid sm:grid-cols-2 gap-3">
        <FakeField label="Service" value={d.service} />
        <FakeField label="Date" value={`${d.date} · ${d.time}`} />
        <FakeField label="Name" value={d.p.name} />
        <FakeField label="Email" value={d.p.email} />
        <FakeField label="Location" value={d.city} />
        <FakeField label="Estimate" value={money2(d.price)} />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <FakeButton invert>Request this date</FakeButton>
        <span className="text-[10px] uppercase tracking-[0.16em] text-white/30">Sample form — not connected</span>
      </div>
    </Frame>
  );
}

function GalleryScreen() {
  const sets = useMemo(() => sample(GALLERY_SETS, 6).map((g) => ({ g, n: rint(18, 240) })), []);
  return (
    <Frame title="Gallery">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {sets.map((s) => <Tile key={s.g} label={s.g} sub={`${s.n} frames`} />)}
      </div>
    </Frame>
  );
}

function ShopScreen() {
  const items = useMemo(() => sample(PRODUCTS, 4).map((p) => ({ p, price: rfloat(14, 120) })), []);
  return (
    <Frame title="Shop">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((i) => <Tile key={i.p} label={i.p} sub={money2(i.price)} />)}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <FakeButton invert>Add to cart</FakeButton>
        <span className="text-[10px] uppercase tracking-[0.16em] text-white/30">
          Disabled in the demo — nothing here can be bought
        </span>
      </div>
    </Frame>
  );
}

function ArchivesScreen() {
  const rows = useMemo(() => sample(ARTICLES, 4).map((t) => ({ t, mins: rint(3, 14), author: shortName(person()) })), []);
  return (
    <Frame title="The Lost Archives">
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.t} className="bg-white/5 px-3 py-2.5" style={{ borderRadius: 0 }}>
            <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-white/85 text-left">{r.t}</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-white/35 text-left mt-0.5">
              {r.author} · {r.mins} min read
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function NewsletterScreen() {
  const p = useMemo(person, []);
  return (
    <Frame title="Newsletter signup">
      <div className="max-w-md">
        <FakeField label="Email" value={p.email} />
        <div className="mt-3"><FakeButton invert>Subscribe</FakeButton></div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-white/50 text-left">
          A real signup here triggers a branded welcome email and drops the reader into the
          campaign list the owner console reports on. In the sandbox it does nothing.
        </p>
      </div>
    </Frame>
  );
}

function AffiliateScreen() {
  const board = useMemo(() => people(4).map((p) => ({ n: shortName(p), e: rint(60, 2400) })), []);
  return (
    <Frame title="Affiliate program">
      <div className="space-y-2">
        {board.map((b, i) => (
          <div key={b.n + i} className="flex items-center justify-between bg-white/5 px-3 py-2.5" style={{ borderRadius: 0 }}>
            <span className="text-[12px] text-white/80">{i + 1}. {b.n}</span>
            <span className="text-[12px] tabular-nums text-purple-400">{money2(b.e)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3"><FakeButton invert>Become an affiliate</FakeButton></div>
    </Frame>
  );
}

function DeliveryScreen() {
  const p = useMemo(person, []);
  const set = useMemo(() => pick(GALLERY_SETS), []);
  return (
    <Frame title="Client download portal">
      <FakeField label="Client" value={p.name} />
      <div className="mt-3"><FakeField label="Gallery" value={`${set} — ${rint(20, 180)} frames`} /></div>
      <div className="mt-3 flex flex-wrap gap-2">
        <FakeButton invert>Download all</FakeButton>
        <FakeButton>Web-size set</FakeButton>
      </div>
    </Frame>
  );
}

interface Stop {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  blurb: string;
  points: string[];
  screen: React.ComponentType;
}

const STOPS: Stop[] = [
  {
    id: 'home',
    icon: HomeIcon,
    title: 'The front door',
    blurb:
      'One page carries the work and the reason to get in touch. No splash screen, no carousel of stock photos — the newest work and the way to book are both above the fold.',
    points: [
      'The masthead is the only navigation; everything else is one tap from it.',
      'Latest articles surface on the homepage, so the site is never static between shoots.',
      'Black ground, no borders, no shadows — separation comes from surface tone alone.',
    ],
    screen: HomeScreen,
  },
  {
    id: 'booking',
    icon: CalendarIcon,
    title: 'Booking, without leaving',
    blurb:
      'Pick a service, pick a date, send the request. It runs on the page — no third-party scheduler, no redirect to somebody else&rsquo;s branded calendar.',
    points: [
      'A submitted request lands in the owner console as a booking, with the estimate attached.',
      'Confirmed work generates its own invoice and deposit link — the owner never hand-writes one.',
      'The client gets a branded confirmation email; the business address is copied on the thread.',
    ],
    screen: BookingScreen,
  },
  {
    id: 'gallery',
    icon: PhotoIcon,
    title: 'The gallery',
    blurb:
      'Sets of finished work, browsable by anyone. Private client sets live behind an access link rather than an account.',
    points: [
      'Photos sync in from the working drive — there is no manual upload step.',
      'A public set sells prints; a private set delivers files to the client who paid for them.',
    ],
    screen: GalleryScreen,
  },
  {
    id: 'shop',
    icon: ShoppingBagIcon,
    title: 'The shop',
    blurb:
      'Prints and merch, checked out on the site. In this walkthrough the cart is a picture — the demo cannot take money.',
    points: [
      'Orders land in the owner console next to bookings, so revenue is read in one place.',
      'Print fulfilment is handed off automatically once payment clears.',
    ],
    screen: ShopScreen,
  },
  {
    id: 'archives',
    icon: BookOpenIcon,
    title: 'The Lost Archives',
    blurb:
      'The writing side of the platform — essays, columns and the book club, published straight from the console.',
    points: [
      'Posts are database rows, not files, so publishing does not require a deploy.',
      'Each column has its own landing page and its own audience.',
    ],
    screen: ArchivesScreen,
  },
  {
    id: 'newsletter',
    icon: EnvelopeIcon,
    title: 'The newsletter',
    blurb:
      'One field, one button. Everything downstream — welcome mail, campaign list, open rates — is the platform&rsquo;s own, not a rented service.',
    points: [
      'Every send uses the branded template; there is no raw-HTML path.',
      'Subscriber growth and open rate report into the owner dashboard.',
    ],
    screen: NewsletterScreen,
  },
  {
    id: 'affiliate',
    icon: LinkIcon,
    title: 'The affiliate program',
    blurb:
      'Readers and customers can carry a referral link and earn on what it brings in, with a tiered downline and a shared end-of-cycle pot.',
    points: [
      'A referral tag survives the whole visit — demo page to shop to checkout.',
      'Partners get their own dashboard; the sandbox version is one tab over.',
    ],
    screen: AffiliateScreen,
  },
  {
    id: 'delivery',
    icon: CloudArrowDownIcon,
    title: 'Delivery',
    blurb:
      'Finished work reaches the client through an access link — no account to create, no file-sharing service in the middle.',
    points: [
      'The link is scoped to one gallery and can be revoked.',
      'Downloads are counted, so the owner knows the job actually landed.',
    ],
    screen: DeliveryScreen,
  },
];

export default function DemoTour() {
  const [i, setI] = useState(0);
  const stop = STOPS[i];
  const Screen = stop.screen;
  const Icon = stop.icon;

  return (
    <>
      <DemoHead
        title="THE LOST+UNFOUNDS — Guided Site Tour"
        description="A guided walkthrough of the customer-facing site: homepage, inline booking, gallery, shop, archives, newsletter and delivery."
      />
      <DemoShell banner="guided tour — drawn screens, nothing is live and nothing can be purchased">
        <div className="max-w-6xl mx-auto px-5 pt-8">
          <Eyebrow>The Lost+Unfounds</Eyebrow>
          <h1 className="mt-1.5 text-3xl sm:text-4xl font-black uppercase tracking-tight text-left">
            Customer Site Tour
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-white/60 text-left max-w-[68ch]">
            Eight stops through what a visitor actually does on the site — arrive, book, browse,
            read, subscribe, buy, and get their files. Each stop shows the screen and says what
            happens behind it. Move with the stops on the left, or the arrows at the bottom.
          </p>

          <div className="mt-6 grid lg:grid-cols-[240px_1fr] gap-4">
            {/* Stop rail */}
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible">
              {STOPS.map((s, n) => {
                const active = n === i;
                const SIcon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setI(n)}
                    style={{ borderRadius: 0 }}
                    className={
                      'shrink-0 lg:shrink flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left ' +
                      (active ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white')
                    }
                  >
                    <SIcon className="w-4 h-4 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] whitespace-nowrap lg:whitespace-normal">
                      {n + 1}. {s.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Stop body */}
            <div className="space-y-4">
              <Panel>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-white/40" />
                  <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-left">
                    Stop {i + 1} of {STOPS.length} — {stop.title}
                  </h2>
                </div>
                <p
                  className="mt-2.5 text-[13px] leading-relaxed text-white/70 text-left max-w-[70ch]"
                  dangerouslySetInnerHTML={{ __html: stop.blurb }}
                />
                <ul className="mt-3 space-y-1.5">
                  {stop.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-[12px] leading-relaxed text-white/55 text-left">
                      <span className="mt-1.5 w-1.5 h-1.5 bg-white/40 shrink-0" style={{ borderRadius: 0 }} />
                      <span dangerouslySetInnerHTML={{ __html: p }} />
                    </li>
                  ))}
                </ul>
              </Panel>

              {/* key remounts the mock so its invented content re-rolls per stop visit */}
              <Screen key={stop.id + i} />

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setI((n) => Math.max(0, n - 1))}
                  disabled={i === 0}
                  style={{ borderRadius: 0 }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors disabled:opacity-30 disabled:hover:bg-white/10 disabled:hover:text-white"
                >
                  <ArrowLeftIcon className="w-3.5 h-3.5" /> Back
                </button>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 tabular-nums">
                  {i + 1} / {STOPS.length}
                </span>
                <button
                  onClick={() => setI((n) => Math.min(STOPS.length - 1, n + 1))}
                  disabled={i === STOPS.length - 1}
                  style={{ borderRadius: 0 }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-black"
                >
                  Next <ArrowRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </DemoShell>
    </>
  );
}
