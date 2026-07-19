import React, { useMemo, useState } from 'react';
import {
  StarIcon, ArrowRightIcon, SunIcon, MoonIcon, ArrowTrendingUpIcon,
  ScissorsIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

/* ============================================================
   FADEBOX — Owner console (sample dashboard).
   Same monochrome identity as the site, no borders — cards are
   separated by background + whitespace. All data is illustrative.
   Route: /fadebox-preview/dashboard
   ============================================================ */

interface Theme { bg: string; panel: string; panel2: string; ink: string; inkDim: string; inkFaint: string; }
function theme(dark: boolean): Theme {
  return dark
    ? { bg: '#000000', panel: '#0d0d0d', panel2: '#171717', ink: '#ffffff', inkDim: 'rgba(255,255,255,0.58)', inkFaint: 'rgba(255,255,255,0.34)' }
    : { bg: '#f6f6f6', panel: '#ffffff', panel2: '#ededed', ink: '#0a0a0a', inkDim: 'rgba(0,0,0,0.55)', inkFaint: 'rgba(0,0,0,0.4)' };
}
function useLocalDark() {
  const [dark, setDark] = useState<boolean>(() => {
    try { const s = localStorage.getItem('fadebox-dash-dark'); return s === null ? false : s !== 'false'; } catch { return false; }
  });
  const toggle = () => setDark(d => { const n = !d; try { localStorage.setItem('fadebox-dash-dark', String(n)); } catch { /* ignore */ } return n; });
  return [dark, toggle] as const;
}

/* ------------------------------ Data (illustrative) ------------------------------ */
const STUDIOS = ['The Triangle', 'Off-5th', 'Box Boyz', 'Studio'] as const;
type StudioName = typeof STUDIOS[number];

type Status = 'Confirmed' | 'Checked in' | 'Upcoming' | 'No-show';
interface Booking { time: string; customer: string; barber: string; studio: StudioName; service: string; price: number; status: Status; }
const BOOKINGS: Booking[] = [
  { time: '9:15', customer: 'Marcus R.', barber: 'Yak', studio: 'The Triangle', service: 'Signature Fade', price: 45, status: 'Checked in' },
  { time: '9:45', customer: 'Andre T.', barber: 'Henry', studio: 'Off-5th', service: 'Cut + Beard', price: 60, status: 'Checked in' },
  { time: '10:30', customer: 'Devin W.', barber: 'Chill', studio: 'The Triangle', service: 'Haircut', price: 40, status: 'Confirmed' },
  { time: '10:45', customer: 'Priya S.', barber: 'Gio', studio: 'Off-5th', service: 'Beard Sculpt', price: 30, status: 'Confirmed' },
  { time: '11:15', customer: 'Sam K.', barber: 'Elux', studio: 'Box Boyz', service: 'Signature Fade', price: 45, status: 'Confirmed' },
  { time: '11:30', customer: 'Tony G.', barber: 'Raquel', studio: 'Studio', service: 'Haircut', price: 40, status: 'No-show' },
  { time: '12:15', customer: 'Luis F.', barber: 'Ralphh', studio: 'The Triangle', service: 'Cut + Beard', price: 60, status: 'Upcoming' },
  { time: '1:00', customer: 'Chris M.', barber: 'Antto', studio: 'Box Boyz', service: 'Lineup', price: 20, status: 'Upcoming' },
  { time: '1:45', customer: 'Jordan P.', barber: 'Henry', studio: 'Off-5th', service: 'Signature Fade', price: 45, status: 'Upcoming' },
  { time: '2:30', customer: 'Nate B.', barber: 'Yak', studio: 'The Triangle', service: 'Signature Fade', price: 45, status: 'Upcoming' },
  { time: '3:15', customer: 'Omar D.', barber: 'JD', studio: 'Studio', service: 'Beard Sculpt', price: 30, status: 'Upcoming' },
  { time: '4:00', customer: 'Eli V.', barber: 'Chill', studio: 'The Triangle', service: 'Cut + Beard', price: 60, status: 'Upcoming' },
  { time: '4:45', customer: 'Wes A.', barber: 'Gee', studio: 'Box Boyz', service: 'Haircut', price: 40, status: 'Upcoming' },
];

interface BarberStat { name: string; studio: StudioName; cuts: number; revenue: number; rating: number; }
const LEADERBOARD: BarberStat[] = [
  { name: 'Yak', studio: 'The Triangle', cuts: 41, revenue: 1845, rating: 4.9 },
  { name: 'Henry', studio: 'Off-5th', cuts: 38, revenue: 1980, rating: 4.9 },
  { name: 'Chill', studio: 'The Triangle', cuts: 36, revenue: 1720, rating: 4.8 },
  { name: 'Elux', studio: 'Box Boyz', cuts: 33, revenue: 1485, rating: 4.8 },
  { name: 'Raquel', studio: 'Studio', cuts: 29, revenue: 1450, rating: 4.7 },
  { name: 'Ralphh', studio: 'The Triangle', cuts: 27, revenue: 1350, rating: 4.7 },
  { name: 'Gio', studio: 'Off-5th', cuts: 25, revenue: 1125, rating: 4.6 },
  { name: 'Antto', studio: 'Box Boyz', cuts: 22, revenue: 990, rating: 4.6 },
];

const WEEK: { d: string; rev: number }[] = [
  { d: 'Mon', rev: 1420 }, { d: 'Tue', rev: 1680 }, { d: 'Wed', rev: 1310 },
  { d: 'Thu', rev: 1890 }, { d: 'Fri', rev: 2540 }, { d: 'Sat', rev: 3120 }, { d: 'Sun', rev: 1240 },
];

const UTIL: Record<StudioName, number> = { 'The Triangle': 86, 'Off-5th': 78, 'Box Boyz': 71, 'Studio': 64 };

const REVIEWS = [
  { quote: 'Cleanest fade I’ve had in Austin. Yak takes his time and it shows.', name: 'Marcus R.', barber: 'Yak' },
  { quote: 'Booking was instant and my barber nailed exactly what I asked for.', name: 'Chris M.', barber: 'Antto' },
  { quote: 'Took my 6-year-old and they made him feel so comfortable.', name: 'Priya S.', barber: 'Gio' },
  { quote: 'On time, on point, every single visit. Worth the drive.', name: 'Nate B.', barber: 'Yak' },
];

const money = (n: number) => '$' + n.toLocaleString('en-US');
const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

/* ------------------------------ Small UI atoms ------------------------------ */
function Card({ t, children, style }: { t: Theme; children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: t.panel, padding: '20px 22px', ...style }}>{children}</div>;
}
function Label({ t, children }: { t: Theme; children: React.ReactNode }) {
  return <div className="text-[0.62rem] font-bold tracking-[0.24em] uppercase" style={{ color: t.inkFaint }}>{children}</div>;
}
function StatusPill({ t, status }: { t: Theme; status: Status }) {
  const attention = status === 'No-show';
  const Icon = status === 'Checked in' ? CheckCircleIcon : status === 'No-show' ? ExclamationTriangleIcon : ClockIcon;
  return (
    <span className="inline-flex items-center gap-1 text-[0.6rem] font-bold tracking-[0.12em] uppercase"
      style={{ padding: '4px 8px', background: attention ? t.ink : t.panel2, color: attention ? t.bg : t.inkDim }}>
      <Icon className="w-3 h-3" /> {status}
    </span>
  );
}

/* ------------------------------ Charts (monochrome) ------------------------------ */
function WeekBars({ t }: { t: Theme }) {
  const max = Math.max(...WEEK.map(w => w.rev));
  const today = WEEK.length - 2; // pretend "today" is Sat
  return (
    <div className="flex items-end gap-2" style={{ height: 120 }}>
      {WEEK.map((w, i) => (
        <div key={w.d} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          <div className="w-full flex items-end justify-center" style={{ height: '100%' }}>
            <div style={{ width: '100%', height: `${(w.rev / max) * 100}%`, background: i === today ? t.ink : t.panel2, minHeight: 4 }} title={money(w.rev)} />
          </div>
          <span className="text-[0.58rem] tracking-wider uppercase" style={{ color: i === today ? t.ink : t.inkFaint, fontWeight: i === today ? 800 : 500 }}>{w.d}</span>
        </div>
      ))}
    </div>
  );
}
function Bar({ t, pct }: { t: Theme; pct: number }) {
  return (
    <div style={{ background: t.panel2, height: 6, width: '100%' }}>
      <div style={{ background: t.ink, height: '100%', width: `${pct}%` }} />
    </div>
  );
}

/* ------------------------------ Root ------------------------------ */
export default function FadeboxDashboard() {
  const [dark, toggleDark] = useLocalDark();
  const t = theme(dark);
  const [studio, setStudio] = useState<StudioName | 'All'>('All');

  const bookings = useMemo(() => studio === 'All' ? BOOKINGS : BOOKINGS.filter(b => b.studio === studio), [studio]);
  const leaders = useMemo(() => (studio === 'All' ? LEADERBOARD : LEADERBOARD.filter(b => b.studio === studio)), [studio]);

  const revenueToday = bookings.filter(b => b.status !== 'No-show').reduce((s, b) => s + b.price, 0);
  const bookedCount = bookings.length;
  const noShows = bookings.filter(b => b.status === 'No-show').length;
  const util = studio === 'All'
    ? Math.round((UTIL['The Triangle'] + UTIL['Off-5th'] + UTIL['Box Boyz'] + UTIL['Studio']) / 4)
    : UTIL[studio as StudioName];
  const rating = 4.9;
  const maxLeadRev = Math.max(...LEADERBOARD.map(b => b.revenue));

  const chips: (StudioName | 'All')[] = ['All', ...STUDIOS];

  const kpis: { label: string; value: string; sub: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
    { label: 'Booked today', value: String(bookedCount), sub: `${noShows} no-show${noShows === 1 ? '' : 's'}`, icon: ScissorsIcon },
    { label: 'Revenue today', value: money(revenueToday), sub: 'Collected + expected', icon: ArrowTrendingUpIcon },
    { label: 'Chair utilization', value: `${util}%`, sub: studio === 'All' ? 'Across 4 studios' : studio, icon: ClockIcon },
    { label: 'Avg rating', value: `${rating}★`, sub: '3,500+ reviews · team-wide', icon: StarIcon },
  ];

  return (
    <div className="min-h-screen font-sans" style={{ background: t.bg, color: t.ink, fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif' }}>
      {/* Top bar */}
      <div className="sticky top-0 z-30" style={{ background: t.ink, color: t.bg }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-7 h-7 font-black text-xs" style={{ background: t.bg, color: t.ink }}>FB</span>
            <div className="leading-none">
              <div className="font-black text-sm tracking-wider uppercase">Fadebox</div>
              <div className="text-[0.58rem] tracking-[0.22em] uppercase" style={{ opacity: 0.6 }}>Owner console</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:block text-[0.62rem] tracking-[0.16em] uppercase" style={{ opacity: 0.6 }}>Today · Fri</span>
            <button onClick={toggleDark} aria-label="Toggle theme" className="p-1.5" style={{ opacity: 0.75 }}>
              {dark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            </button>
            <a href="/fadebox-preview" className="inline-flex items-center gap-1.5 text-[0.66rem] font-black tracking-[0.14em] uppercase" style={{ background: t.bg, color: t.ink, padding: '9px 14px' }}>
              View site <ArrowRightIcon className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Studio filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {chips.map(c => {
            const active = studio === c;
            return (
              <button key={c} onClick={() => setStudio(c)}
                className="text-[0.68rem] font-bold tracking-[0.12em] uppercase transition-colors"
                style={{ padding: '9px 16px', background: active ? t.ink : t.panel, color: active ? t.bg : t.inkDim }}>
                {c}
              </button>
            );
          })}
        </div>

        {/* KPI row */}
        <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
          {kpis.map(k => (
            <Card key={k.label} t={t}>
              <div className="flex items-start justify-between">
                <Label t={t}>{k.label}</Label>
                <k.icon className="w-4 h-4" style={{ color: t.inkFaint }} />
              </div>
              <div className="font-black mt-3" style={{ fontSize: '2.1rem', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
              <div className="text-[0.68rem] mt-1" style={{ color: t.inkFaint }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        {/* Two-column: schedule + side */}
        <div className="grid gap-3" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)' }}>
          {/* Left: schedule */}
          <Card t={t} style={{ padding: 0 }}>
            <div className="flex items-center justify-between" style={{ padding: '20px 22px 14px' }}>
              <Label t={t}>Today’s schedule</Label>
              <span className="text-[0.62rem] tracking-wider uppercase" style={{ color: t.inkFaint }}>{bookings.length} chairs</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 460 }}>
                {bookings.map((b, i) => (
                  <div key={i} className="flex items-center gap-3" style={{ padding: '12px 22px', background: i % 2 ? t.panel2 : 'transparent' }}>
                    <span className="font-bold" style={{ fontFamily: 'ui-monospace,monospace', fontVariantNumeric: 'tabular-nums', width: 52, color: t.ink }}>{b.time}</span>
                    <span className="grid place-items-center text-[0.6rem] font-black flex-shrink-0" style={{ width: 28, height: 28, background: t.ink, color: t.bg }}>{b.barber.slice(0, 2).toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate" style={{ color: t.ink }}>{b.customer}</div>
                      <div className="text-[0.64rem] truncate" style={{ color: t.inkFaint }}>{b.barber} · {b.service}{studio === 'All' ? ` · ${b.studio}` : ''}</div>
                    </div>
                    <span className="font-bold hidden sm:block" style={{ fontFamily: 'ui-monospace,monospace', color: t.ink }}>{money(b.price)}</span>
                    <StatusPill t={t} status={b.status} />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Right column */}
          <div className="flex flex-col gap-3">
            {/* Revenue this week */}
            <Card t={t}>
              <div className="flex items-center justify-between mb-4">
                <Label t={t}>Revenue this week</Label>
                <span className="text-[0.68rem] font-bold" style={{ color: t.ink }}>{money(WEEK.reduce((s, w) => s + w.rev, 0))}</span>
              </div>
              <WeekBars t={t} />
            </Card>

            {/* Utilization by studio */}
            <Card t={t}>
              <Label t={t}>Chair utilization</Label>
              <div className="flex flex-col gap-3 mt-4">
                {STUDIOS.map(s => (
                  <div key={s}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[0.7rem] tracking-wide uppercase" style={{ color: t.inkDim }}>{s}</span>
                      <span className="text-[0.7rem] font-bold" style={{ color: t.ink, fontVariantNumeric: 'tabular-nums' }}>{UTIL[s]}%</span>
                    </div>
                    <Bar t={t} pct={UTIL[s]} />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Leaderboard + reviews */}
        <div className="grid gap-3 mt-3" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)' }}>
          {/* Barber leaderboard */}
          <Card t={t} style={{ padding: 0 }}>
            <div className="flex items-center justify-between" style={{ padding: '20px 22px 14px' }}>
              <Label t={t}>Barber leaderboard · this week</Label>
              <span className="text-[0.62rem] tracking-wider uppercase" style={{ color: t.inkFaint }}>{studio === 'All' ? 'All studios' : studio}</span>
            </div>
            <div>
              {leaders.map((b, i) => (
                <div key={b.name} className="flex items-center gap-3" style={{ padding: '12px 22px', background: i % 2 ? t.panel2 : 'transparent' }}>
                  <span className="font-black text-sm" style={{ width: 20, color: t.inkFaint, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                  <span className="grid place-items-center text-[0.6rem] font-black flex-shrink-0" style={{ width: 28, height: 28, background: t.ink, color: t.bg }}>{initials(b.name)}</span>
                  <div className="min-w-0" style={{ width: 96 }}>
                    <div className="text-sm font-bold truncate" style={{ color: t.ink }}>{b.name}</div>
                    <div className="text-[0.6rem] truncate" style={{ color: t.inkFaint }}>{b.studio}</div>
                  </div>
                  <div className="flex-1 min-w-0 hidden sm:block"><Bar t={t} pct={Math.round((b.revenue / maxLeadRev) * 100)} /></div>
                  <span className="text-[0.7rem] hidden sm:flex items-center gap-1" style={{ color: t.inkDim, width: 44 }}><StarIcon className="w-3 h-3" />{b.rating}</span>
                  <span className="font-bold" style={{ fontFamily: 'ui-monospace,monospace', width: 64, textAlign: 'right', color: t.ink }}>{money(b.revenue)}</span>
                </div>
              ))}
              {leaders.length === 0 && <div style={{ padding: '20px 22px', color: t.inkFaint }} className="text-sm">No barbers for this studio yet.</div>}
            </div>
          </Card>

          {/* Recent reviews */}
          <Card t={t}>
            <div className="flex items-center justify-between mb-4">
              <Label t={t}>Latest reviews</Label>
              <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold" style={{ color: t.ink }}><StarIcon className="w-3.5 h-3.5" />4.9</span>
            </div>
            <div className="flex flex-col gap-4">
              {REVIEWS.map((r, i) => (
                <div key={i} className="flex flex-col gap-1.5" style={{ paddingBottom: i < REVIEWS.length - 1 ? 16 : 0 }}>
                  <div style={{ color: t.ink, fontSize: '0.55rem', letterSpacing: '0.1em' }}>★★★★★</div>
                  <div className="text-[0.82rem]" style={{ color: t.ink, lineHeight: 1.45 }}>“{r.quote}”</div>
                  <div className="text-[0.62rem] tracking-wide uppercase" style={{ color: t.inkFaint }}>{r.name} · for {r.barber}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <p className="text-[0.6rem] tracking-[0.16em] uppercase mt-6" style={{ color: t.inkFaint }}>
          Sample console · illustrative data · wired to live bookings &amp; Google reviews at launch
        </p>
      </div>
    </div>
  );
}
