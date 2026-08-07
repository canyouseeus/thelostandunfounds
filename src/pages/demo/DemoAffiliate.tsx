/* ============================================================
   DEMO SANDBOX — affiliate dashboard. Route: /demo/affiliate

   Joshua: "on my admin dashboard I have a button where I can go to my
   affiliate page. Just leave that toggle in there so that people can click
   that and they can go and view what an affiliate dashboard looks like."

   This is the far end of that toggle. It mirrors the shape of the real
   affiliate console — referral link, click/conversion funnel, commission
   ledger, downline tiers, King Midas pot, payout history — with a fabricated
   affiliate, a fabricated code and fabricated money. It imports nothing from
   the live affiliate stack.

   The referral code shown here is a nonsense string, deliberately: a demo
   visitor copying it must not be able to credit or damage a real affiliate.
   ============================================================ */
import { useMemo, useState } from 'react';
import {
  LinkIcon, ArrowPathIcon, TrophyIcon, BanknotesIcon, UserGroupIcon,
  CursorArrowRaysIcon, CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { CHART_ACCENTS, Sparkline } from '../../components/ui/viz';
import { DemoHead, DemoShell, Panel, Eyebrow, Stat } from './DemoChrome';
import {
  person, people, shortName, pick, rint, rfloat, series, money, money2,
  lastMonths, CHANNELS, PRODUCTS, timeline,
} from './demo-data';

/* Tier is a function of lifetime earnings, never an independent roll — an
   independent one puts Bronze above King Midas on the leaderboard. */
const tierFor = (earned: number) =>
  earned > 3000 ? 'King Midas' : earned > 1800 ? 'Gold' : earned > 700 ? 'Silver' : 'Bronze';

function rollAffiliate() {
  const me = person();
  const commissionTimes = timeline(6);
  const payoutTimes = timeline(3);
  const clicks = rint(240, 4800);
  const conversions = Math.round(clicks * rfloat(0.012, 0.075, 4));
  const earnings = rfloat(conversions * 4.5, conversions * 26);
  const paid = rfloat(earnings * 0.35, earnings * 0.85);

  return {
    me,
    /* Nonsense code — cannot collide with a live affiliate's. */
    code: 'DEMO-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
    tier: tierFor(earnings),
    clicks,
    conversions,
    rate: clicks ? Number(((conversions / clicks) * 100).toFixed(2)) : 0,
    earnings,
    paid,
    available: Math.max(0, earnings - paid),
    months: lastMonths(9),
    earnSeries: series(9, rint(40, 260)),

    commissions: Array.from({ length: 6 }, (_, i) => ({
      when: commissionTimes[i],
      buyer: shortName(person()),
      item: pick(PRODUCTS),
      sale: rfloat(18, 340),
      rate: pick([10, 12, 15, 20]),
      channel: pick(CHANNELS),
    })).map((c) => ({ ...c, commission: Number(((c.sale * c.rate) / 100).toFixed(2)) })),

    /* A tier with nobody in it has earned nothing — rolling `members` and
       `earned` independently produced "0 members, $45.39 earned", which reads
       as a bug in the product rather than a demo. */
    downline: [1, 2, 3].map((level) => {
      const members = rint(0, Math.max(1, 14 - level * 4));
      return {
        level,
        members,
        share: [10, 5, 2][level - 1],
        earned: members === 0 ? 0 : rfloat(members * 4, members * (90 / level)),
      };
    }),

    /* Tier follows earnings, and names are deduped: an independent roll gave a
       Bronze affiliate the top row above a King Midas one, and printed the
       same short name twice. Neither is real-looking. */
    leaderboard: Array.from(
      new Map(people(9).map((p) => [shortName(p), p])).values()
    )
      .slice(0, 6)
      .map((p) => ({ name: shortName(p), earned: rint(80, 4200) }))
      .sort((a, b) => b.earned - a.earned)
      .map((r) => ({
        ...r,
        tier: tierFor(r.earned),
      })),

    pot: rint(1200, 9800),
    potShare: rfloat(1.5, 18, 1),

    payouts: Array.from({ length: 3 }, (_, i) => ({
      when: payoutTimes[i],
      amount: rfloat(45, 900),
      method: pick(['Stripe Connect', 'Stripe Connect', 'Bank transfer'] as const),
      status: pick(['Paid', 'Paid', 'In transit'] as const),
    })),
  };
}

type Aff = ReturnType<typeof rollAffiliate>;

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-white text-left">{children}</h2>
    </div>
  );
}

function Row({ cells, head = false }: { cells: React.ReactNode[]; head?: boolean }) {
  return (
    <div
      className={'grid gap-3 px-3 py-2.5 ' + (head ? '' : 'bg-white/5 hover:bg-white/10 transition-colors')}
      style={{ borderRadius: 0, gridTemplateColumns: `repeat(${cells.length}, minmax(0,1fr))` }}
    >
      {cells.map((c, i) => (
        <div
          key={i}
          className={
            'truncate text-left ' +
            (head ? 'text-[9px] font-black uppercase tracking-[0.2em] text-white/35' : 'text-[11.5px] text-white/80')
          }
        >
          {c}
        </div>
      ))}
    </div>
  );
}

function ReferralStrip({ a }: { a: Aff }) {
  const [copied, setCopied] = useState(false);
  const url = `https://www.thelostandunfounds.com/?ref=${a.code}`;
  return (
    <Panel tone="raised">
      <SectionTitle icon={<LinkIcon className="w-4 h-4 text-white/40" />}>Your referral link</SectionTitle>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 bg-white/5 px-3 py-2.5 text-[12px] text-white/70 truncate text-left" style={{ borderRadius: 0 }}>
          {url}
        </div>
        <button
          onClick={() => {
            /* Nothing leaves the page — the sandbox code is meaningless by
               design, so this only proves the button exists. */
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          style={{ borderRadius: 0 }}
          className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors"
        >
          {copied ? 'Sample only' : 'Copy link'}
        </button>
      </div>
      <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/30 text-left">
        Sample code — it tracks nothing and credits no one.
      </p>
    </Panel>
  );
}

export default function DemoAffiliate() {
  const [roll, setRoll] = useState(0);
  const a = useMemo(() => rollAffiliate(), [roll]);

  return (
    <>
      <DemoHead
        title="THE LOST+UNFOUNDS — Affiliate Dashboard Demo"
        description="A sample of the affiliate console: referral tracking, commissions, tiers and payouts. Sandbox data only."
      />
      <DemoShell banner="affiliate dashboard, invented affiliate, invented money">
        <div className="max-w-6xl mx-auto px-5 pt-8 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow>Affiliate Program</Eyebrow>
              <h1 className="mt-1.5 text-3xl sm:text-4xl font-black uppercase tracking-tight text-left">
                Affiliate Dashboard
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-white/60 text-left max-w-[62ch]">
                What a partner sees after they sign up: the link they share, what it earned, who
                they brought in, and when they get paid. Signed in here as{' '}
                <span className="text-white/85">{a.me.name}</span> &mdash; a person who does not exist.
              </p>
            </div>
            <button
              onClick={() => setRoll((r) => r + 1)}
              style={{ borderRadius: 0 }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors self-start"
            >
              <ArrowPathIcon className="w-3.5 h-3.5" />
              Reshuffle data
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Lifetime earnings" value={money2(a.earnings)} sub={`${a.tier} tier`} accent="text-purple-400" />
            <Stat label="Available now" value={money2(a.available)} sub={`${money2(a.paid)} paid out`} accent="text-green-400" />
            <Stat label="Clicks" value={a.clicks.toLocaleString()} sub={`${a.rate}% convert`} accent="text-blue-400" />
            <Stat label="Conversions" value={a.conversions.toLocaleString()} sub="Attributed sales" accent="text-amber-500" />
          </div>

          <ReferralStrip a={a} />

          <div className="grid lg:grid-cols-3 gap-4">
            <Panel className="lg:col-span-2">
              <SectionTitle icon={<BanknotesIcon className="w-4 h-4 text-white/40" />}>Commission earned</SectionTitle>
              <div className={`h-40 ${CHART_ACCENTS.affiliates}`}>
                {/* h-full — Sparkline measures its own box, not the wrapper's */}
                <Sparkline values={a.earnSeries} className="h-full" />
              </div>
              <div className="mt-2 flex justify-between">
                {a.months.map((m) => (
                  <span key={m} className="text-[9px] uppercase tracking-[0.16em] text-white/30">{m}</span>
                ))}
              </div>
            </Panel>

            <Panel>
              <SectionTitle icon={<TrophyIcon className="w-4 h-4 text-white/40" />}>King Midas pot</SectionTitle>
              <div className="text-3xl font-black tabular-nums text-amber-500 text-left">{money(a.pot)}</div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-white/55 text-left">
                The shared pot the top tier splits at the end of the cycle. Your current share is{' '}
                <span className="text-white/85 tabular-nums">{a.potShare}%</span>.
              </p>
              <div className="mt-3 h-1.5 bg-white/10" style={{ borderRadius: 0 }}>
                <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, a.potShare * 4)}%` }} />
              </div>
            </Panel>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Panel>
              <SectionTitle icon={<CursorArrowRaysIcon className="w-4 h-4 text-white/40" />}>Recent commissions</SectionTitle>
              <div className="space-y-1">
                <Row head cells={['When', 'Buyer', 'Item', 'Sale', 'You earned']} />
                {a.commissions.map((c, i) => (
                  <Row
                    key={i}
                    cells={[
                      c.when,
                      c.buyer,
                      c.item,
                      <span className="tabular-nums">{money2(c.sale)}</span>,
                      <span className="tabular-nums text-purple-400">{money2(c.commission)}</span>,
                    ]}
                  />
                ))}
              </div>
            </Panel>

            <div className="space-y-4">
              <Panel>
                <SectionTitle icon={<UserGroupIcon className="w-4 h-4 text-white/40" />}>Your downline</SectionTitle>
                <div className="space-y-1">
                  <Row head cells={['Tier', 'Members', 'Your share', 'Earned']} />
                  {a.downline.map((d) => (
                    <Row
                      key={d.level}
                      cells={[
                        `Level ${d.level}`,
                        <span className="tabular-nums">{d.members}</span>,
                        <span className="tabular-nums">{d.share}%</span>,
                        <span className="tabular-nums">{money2(d.earned)}</span>,
                      ]}
                    />
                  ))}
                </div>
              </Panel>

              <Panel>
                <SectionTitle icon={<CheckBadgeIcon className="w-4 h-4 text-white/40" />}>Payout history</SectionTitle>
                <div className="space-y-1">
                  <Row head cells={['When', 'Amount', 'Method', 'Status']} />
                  {a.payouts.map((p, i) => (
                    <Row
                      key={i}
                      cells={[
                        p.when,
                        <span className="tabular-nums">{money2(p.amount)}</span>,
                        p.method,
                        <span className={p.status === 'Paid' ? 'text-green-400' : 'text-amber-500'}>{p.status}</span>,
                      ]}
                    />
                  ))}
                </div>
              </Panel>
            </div>
          </div>

          <Panel>
            <SectionTitle icon={<TrophyIcon className="w-4 h-4 text-white/40" />}>Leaderboard</SectionTitle>
            <div className="space-y-1">
              <Row head cells={['#', 'Affiliate', 'Tier', 'Earned this cycle']} />
              {a.leaderboard.map((l, i) => (
                <Row
                  key={l.name + i}
                  cells={[
                    <span className="tabular-nums">{i + 1}</span>,
                    l.name,
                    l.tier,
                    <span className="tabular-nums">{money(l.earned)}</span>,
                  ]}
                />
              ))}
            </div>
          </Panel>
        </div>
      </DemoShell>
    </>
  );
}
