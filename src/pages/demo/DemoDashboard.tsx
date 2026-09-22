/* ============================================================
   DEMO SANDBOX — owner dashboard. Route: /demo/dashboard

   This is a drawing of the real admin console, not the console. It imports no
   Supabase client, no auth context and no admin component; every figure comes
   from ./demo-data and is rolled fresh on mount, so no two visits look alike.

   Joshua: "No customer should ever see my admin page on this demo... just puts
   random numbers on there so it doesn't load the same every single time."

   The affiliate toggle stays, because the real console has one:
   Admin.tsx renders an Affiliates panel and the owner jumps to the affiliate
   dashboard from it. Here that button goes to /demo/affiliate — the sandbox
   twin — and never to the live /affiliate.

   GRAPH STYLE RULE: charts draw through the shared Sparkline / MiniBars
   primitives in components/ui/viz.tsx and are told apart by CHART_ACCENTS
   colour only. No new chart dialect is introduced here.
   ============================================================ */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BanknotesIcon, UsersIcon, PhotoIcon, EnvelopeIcon, LinkIcon,
  CalendarIcon, ShoppingBagIcon, BookOpenIcon, ArrowPathIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { CHART_ACCENTS, Sparkline, MiniBars, StatusMarks } from '../../components/ui/viz';
import { DemoHead, DemoShell, Panel, Eyebrow, Stat } from './DemoChrome';
import {
  people, person, shortName, maskEmail, pick, rint, rfloat, sample, series,
  money, money2, lastMonths, DAY_LABELS, SERVICES, PRODUCTS, GALLERY_SETS,
  ARTICLES, CHANNELS, CITIES, timeline, soonDate, clockTime,
} from './demo-data';

/* Rolls one complete console's worth of fabricated state. */
function rollConsole() {
  const months = lastMonths(9);
  /* Time-ordered stamps — see timeline() in demo-data. */
  const orderTimes = timeline(6);
  const subTimes = timeline(5);
  const revenueSeries = series(9, rint(900, 2200));
  const total = revenueSeries.reduce((a, b) => a + b, 0);

  const split = {
    shop: rfloat(0.2, 0.4, 3),
    gallery: rfloat(0.15, 0.3, 3),
    bookings: rfloat(0.2, 0.4, 3),
  };
  const affiliateShare = Math.max(0.05, 1 - split.shop - split.gallery - split.bookings);

  return {
    months,
    revenueSeries,
    total,
    mrrDelta: rfloat(-8, 34, 1),
    breakdown: [
      { label: 'Shop', value: Math.round(total * split.shop) },
      { label: 'Gallery', value: Math.round(total * split.gallery) },
      { label: 'Bookings', value: Math.round(total * split.bookings) },
      { label: 'Affiliate', value: Math.round(total * affiliateShare) },
    ],
    traffic: series(7, rint(120, 480)),
    subscribers: rint(840, 6200),
    subsDelta: rint(4, 90),
    users: rint(210, 1900),
    photos: rint(320, 2600),
    products: rint(8, 34),
    postCount: rint(14, 90),
    affiliates: rint(6, 58),
    openRate: rfloat(31, 62, 1),

    orders: Array.from({ length: 6 }, (_, i) => {
      const p = person();
      return {
        id: 'LU-' + rint(10000, 99999),
        customer: shortName(p),
        email: maskEmail(p.email),
        item: pick(PRODUCTS),
        amount: rfloat(18, 240),
        channel: pick(CHANNELS),
        when: orderTimes[i],
        status: pick(['Paid', 'Paid', 'Paid', 'Fulfilled', 'Refunded'] as const),
      };
    }),

    bookings: Array.from({ length: 5 }, () => {
      const p = person();
      return {
        client: p.name,
        email: p.email,
        service: pick(SERVICES),
        date: soonDate(),
        time: clockTime(),
        city: pick(CITIES),
        value: rint(250, 2400),
        status: pick(['Deposit paid', 'Awaiting deposit', 'Confirmed', 'Confirmed'] as const),
      };
    }),

    subscribersList: people(5).map((p, i) => ({
      name: p.name,
      email: maskEmail(p.email),
      source: pick(CHANNELS),
      when: subTimes[i],
    })),

    galleries: sample(GALLERY_SETS, 4).map((g) => ({
      name: g,
      photos: rint(24, 380),
      downloads: rint(0, 90),
      revenue: rint(0, 900),
    })),

    posts: sample(ARTICLES, 4).map((t) => ({
      title: t,
      views: rint(60, 5400),
      reads: rfloat(28, 91, 1),
    })),

    health: [
      { label: 'Database', ok: true },
      { label: 'API Engine', ok: true },
      { label: 'Auth', ok: Math.random() > 0.12 },
      { label: 'Storage', ok: Math.random() > 0.08 },
    ],
  };
}

type Console = ReturnType<typeof rollConsole>;

/* ------------------------------- sub-views -------------------------------- */

function SectionTitle({ icon, children, extra }: { icon: React.ReactNode; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-white text-left">{children}</h2>
      </div>
      {extra}
    </div>
  );
}

function Row({ cells, head = false }: { cells: React.ReactNode[]; head?: boolean }) {
  return (
    <div
      className={
        'grid gap-3 px-3 py-2.5 ' +
        (head ? 'bg-transparent' : 'bg-white/5 hover:bg-white/10 transition-colors')
      }
      style={{ borderRadius: 0, gridTemplateColumns: `repeat(${cells.length}, minmax(0,1fr))` }}
    >
      {cells.map((c, i) => (
        <div
          key={i}
          className={
            'truncate text-left ' +
            (head
              ? 'text-[9px] font-black uppercase tracking-[0.2em] text-white/35'
              : 'text-[11.5px] text-white/80')
          }
        >
          {c}
        </div>
      ))}
    </div>
  );
}

function Overview({ c }: { c: Console }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Revenue — 9 mo" value={money(c.total)} sub={`${c.mrrDelta >= 0 ? '+' : ''}${c.mrrDelta}% vs prior`} accent="text-green-400" />
        <Stat label="Subscribers" value={c.subscribers.toLocaleString()} sub={`+${c.subsDelta} this week`} accent="text-blue-400" />
        <Stat label="Affiliates" value={String(c.affiliates)} sub={`${c.openRate}% email open rate`} accent="text-purple-400" />
        <Stat label="Open bookings" value={String(c.bookings.length)} sub="Next 21 days" accent="text-amber-500" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel className="lg:col-span-2">
          <SectionTitle icon={<BanknotesIcon className="w-4 h-4 text-white/40" />}>Revenue performance</SectionTitle>
          {/* h-full on the Sparkline itself: it measures its OWN box with a
              ResizeObserver, so height on the wrapper alone leaves it at its
              12px minimum and the trace draws as a flat sliver. */}
          <div className={`h-40 ${CHART_ACCENTS.revenue}`}>
            <Sparkline values={c.revenueSeries} className="h-full" />
          </div>
          <div className="mt-2 flex justify-between">
            {c.months.map((m) => (
              <span key={m} className="text-[9px] uppercase tracking-[0.16em] text-white/30">{m}</span>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle icon={<ShoppingBagIcon className="w-4 h-4 text-white/40" />}>Where it came from</SectionTitle>
          <div className="space-y-2.5 mt-1">
            {c.breakdown.map((b) => {
              const max = Math.max(...c.breakdown.map((x) => x.value));
              return (
                <div key={b.label}>
                  <div className="flex justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">{b.label}</span>
                    <span className="text-[11px] tabular-nums text-white/80">{money(b.value)}</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-white/10" style={{ borderRadius: 0 }}>
                    <div className="h-full bg-green-400" style={{ width: `${(b.value / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel>
          <SectionTitle icon={<UsersIcon className="w-4 h-4 text-white/40" />}>Traffic — 7 days</SectionTitle>
          <div className={`h-24 ${CHART_ACCENTS.analytics}`}>
            <MiniBars values={c.traffic.map((v, i) => ({ label: DAY_LABELS[i], value: v }))} />
          </div>
          <div className="mt-2 flex justify-between">
            {DAY_LABELS.map((d) => (
              <span key={d} className="text-[9px] uppercase tracking-[0.16em] text-white/30">{d}</span>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle icon={<ArrowPathIcon className="w-4 h-4 text-white/40" />}>Network status</SectionTitle>
          <StatusMarks items={c.health} className="mt-3" />
          <div className="mt-4 grid grid-cols-2 gap-y-2">
            {[
              ['Users', c.users],
              ['Photos', c.photos],
              ['Products', c.products],
              ['Articles', c.postCount],
            ].map(([l, v]) => (
              <div key={String(l)}>
                <div className="text-[9px] uppercase tracking-[0.2em] text-white/35 text-left">{l}</div>
                <div className="text-sm font-black tabular-nums text-left">{Number(v).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle icon={<BookOpenIcon className="w-4 h-4 text-white/40" />}>Top articles</SectionTitle>
          <div className="space-y-2 mt-1">
            {c.posts.map((p) => (
              <div key={p.title} className="flex items-baseline justify-between gap-3">
                <span className="text-[11.5px] text-white/80 truncate text-left">{p.title}</span>
                <span className="text-[10px] tabular-nums text-white/40 shrink-0">{p.views.toLocaleString()} · {p.reads}%</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function OrdersView({ c }: { c: Console }) {
  return (
    <Panel>
      <SectionTitle icon={<ShoppingBagIcon className="w-4 h-4 text-white/40" />}>Recent orders</SectionTitle>
      <div className="space-y-1">
        <Row head cells={['Order', 'Customer', 'Item', 'Channel', 'Amount', 'Status']} />
        {c.orders.map((o) => (
          <Row
            key={o.id}
            cells={[
              <span className="tabular-nums">{o.id}</span>,
              <span title={o.email}>{o.customer}</span>,
              o.item,
              o.channel,
              <span className="tabular-nums">{money2(o.amount)}</span>,
              <span className={o.status === 'Refunded' ? 'text-amber-500' : 'text-green-400'}>{o.status}</span>,
            ]}
          />
        ))}
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-white/30 text-left">
        Addresses are masked here exactly as they are in the live console — but these ones are invented.
      </p>
    </Panel>
  );
}

function BookingsView({ c }: { c: Console }) {
  return (
    <Panel>
      <SectionTitle icon={<CalendarIcon className="w-4 h-4 text-white/40" />}>Booking requests</SectionTitle>
      <div className="space-y-1">
        <Row head cells={['Client', 'Service', 'Date', 'Where', 'Value', 'Status']} />
        {c.bookings.map((b, i) => (
          <Row
            key={i}
            cells={[
              b.client,
              b.service,
              `${b.date} · ${b.time}`,
              b.city,
              <span className="tabular-nums">{money(b.value)}</span>,
              <span className={b.status === 'Awaiting deposit' ? 'text-amber-500' : 'text-green-400'}>{b.status}</span>,
            ]}
          />
        ))}
      </div>
    </Panel>
  );
}

function AudienceView({ c }: { c: Console }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Panel>
        <SectionTitle icon={<EnvelopeIcon className="w-4 h-4 text-white/40" />}>Newest subscribers</SectionTitle>
        <div className="space-y-1">
          <Row head cells={['Name', 'Email', 'Source', 'Joined']} />
          {c.subscribersList.map((s, i) => (
            <Row key={i} cells={[s.name, s.email, s.source, s.when]} />
          ))}
        </div>
      </Panel>
      <Panel>
        <SectionTitle icon={<PhotoIcon className="w-4 h-4 text-white/40" />}>Galleries</SectionTitle>
        <div className="space-y-1">
          <Row head cells={['Set', 'Photos', 'Downloads', 'Revenue']} />
          {c.galleries.map((g) => (
            <Row
              key={g.name}
              cells={[
                g.name,
                <span className="tabular-nums">{g.photos}</span>,
                <span className="tabular-nums">{g.downloads}</span>,
                <span className="tabular-nums">{money(g.revenue)}</span>,
              ]}
            />
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------------- page ---------------------------------- */

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'orders', label: 'Orders' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'audience', label: 'Audience' },
] as const;

export default function DemoDashboard() {
  /* `roll` is a counter, not a value — bumping it re-runs the memo, so the
     "reshuffle" button deals a whole new console without a page reload. The
     empty first render already differs from the last visit because nothing is
     persisted. */
  const [roll, setRoll] = useState(0);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('overview');
  const c = useMemo(() => rollConsole(), [roll]);

  return (
    <>
      <DemoHead
        title="THE LOST+UNFOUNDS — Owner Dashboard Demo"
        description="A sample of the owner console: revenue, orders, bookings and audience. Sandbox data only."
      />
      <DemoShell banner="owner dashboard, invented data, refreshes on every visit">
        <div className="max-w-6xl mx-auto px-5 pt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow>The Lost+Unfounds</Eyebrow>
              <h1 className="mt-1.5 text-3xl sm:text-4xl font-black uppercase tracking-tight text-left">
                Owner Dashboard
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-white/60 text-left max-w-[62ch]">
                The console the business runs from — money, orders, bookings and audience in one
                place. Everything below is fabricated and re-rolls each time you land here.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRoll((r) => r + 1)}
                style={{ borderRadius: 0 }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
              >
                <ArrowPathIcon className="w-3.5 h-3.5" />
                Reshuffle data
              </button>
              {/* The real console keeps a jump to the affiliate side; the demo
                  keeps it too, pointed at the sandbox affiliate console. */}
              <Link
                to="/demo/affiliate"
                style={{ borderRadius: 0 }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                Affiliate dashboard
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{ borderRadius: 0 }}
                className={
                  'px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors ' +
                  (tab === t.id ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white')
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {tab === 'overview' && <Overview c={c} />}
            {tab === 'orders' && <OrdersView c={c} />}
            {tab === 'bookings' && <BookingsView c={c} />}
            {tab === 'audience' && <AudienceView c={c} />}
          </div>
        </div>
      </DemoShell>
    </>
  );
}
