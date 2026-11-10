/**
 * Affiliate Program Terms
 *
 * The terms every affiliate agrees to by joining the program. They sit on top
 * of the general Terms of Use (/terms), not in place of them.
 *
 * Every number here must match the code: the split in the
 * `register_referral_conversion` RPC (via _commission-trigger.ts), the hold in
 * dashboard.ts, the $10 minimum in request-payout.ts and the 30-day cookie in
 * src/utils/affiliate-tracking.ts. Change the code and this page together.
 *
 * The date is fixed on purpose: bump it when the terms change.
 */

import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export const AFFILIATE_TERMS_UPDATED = 'November 10, 2026';

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-3">
        {n}. {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc list-outside ml-5 space-y-1">{children}</ul>;
}

const brand = <strong className="font-bold">THE LOST+UNFOUNDS</strong>;

export default function AffiliateTerms() {
  return (
    <div className="text-left">
      <h1 className="text-3xl font-bold text-white uppercase tracking-tight mb-4">
        AFFILIATE TERMS
      </h1>
      <p className="text-white/60 text-sm mb-8">Last updated: {AFFILIATE_TERMS_UPDATED}</p>

      <div className="space-y-8 text-white/80 text-left">
        <section className="bg-white/5 p-5" style={{ borderRadius: 0 }}>
          <p>
            These Affiliate Terms (the "Terms") govern anyone ("you") who joins the {brand} affiliate
            program ("we", "us"). They apply in addition to our general{' '}
            <Link to="/terms" className="underline hover:text-white">Terms of Use</Link> and{' '}
            <Link to="/privacy" className="underline hover:text-white">Privacy Policy</Link>. By creating an
            affiliate code, sharing an affiliate link or connecting a payout account, you agree to these Terms.
          </p>
        </section>

        <Section n={1} title="Joining">
          <p>
            Joining is free. You need a site account, your name, a phone number and an affiliate code of your
            choosing. Your code must not impersonate another person or brand or mislead anyone about who you
            are. We may refuse or change a code that does.
          </p>
        </Section>

        <Section n={2} title="What you earn">
          <p>
            Every share is a percentage of <strong className="text-white">profit</strong>: what the customer
            paid, minus what the sale cost us (for example printing, or the photographer's share of a job or a
            gallery sale). It is never a percentage of the full price.
          </p>
          <List>
            <li><strong className="text-white">Direct commission:</strong> 42% of the profit on each sale you refer.</li>
            <li><strong className="text-white">Affiliates you recruit:</strong> 2% of the profit on their referred sales (Level 1), and 1% on the sales of affiliates they recruit (Level 2).</li>
            <li><strong className="text-white">King Midas:</strong> 8% of the profit from each day's affiliate sales goes into a pot, ranked by the profit each affiliate brought in that day. 1st place gets 50% of the pot, 2nd 30% and 3rd 10%; everyone else on the board splits the last 10%. Whatever isn't claimed goes to the Secret Santa pot. Days run on Central time. The <Link to="/king-midas-leaderboard" className="underline hover:text-white">leaderboard</Link> shows the rankings.</li>
            <li><strong className="text-white">Secret Santa:</strong> 3% of profit goes into a yearly pot, shared on December 25 among active affiliates in proportion to the reward points they earned that year (1 point per $10 of profit).</li>
          </List>
          <p>
            Commissions apply to sales made through the site: gallery and photo orders, print orders, booked
            services and event tickets. A commission can be cancelled if its order is cancelled, refunded or
            charged back.
          </p>
        </Section>

        <Section n={3} title="How referrals are tracked">
          <List>
            <li>Your links carry your code (<code className="text-white">?ref=YOURCODE</code>). A visitor who arrives through one is credited to you for 30 days on that browser.</li>
            <li>Once that customer buys, they are tied to you for life. Their later purchases earn you commission too, and the tie is never moved to another affiliate.</li>
            <li>If a customer is already tied to another affiliate, that affiliate keeps them.</li>
          </List>
        </Section>

        <Section n={4} title="Payouts">
          <List>
            <li>Payouts go through Stripe Connect. You need a connected Stripe account with payouts enabled before you can be paid. Your bank and tax details go to Stripe, not to us.</li>
            <li>Request a payout from your dashboard any time your available balance is at least $10.</li>
            <li>Commissions on print orders are held 30 days before they become available. Everything else is available once the customer's payment settles.</li>
            <li>We send the money to your Stripe account when you request it. Stripe then pays your bank on its own schedule, usually within 1–2 business days.</li>
            <li>Your tax records come through your Stripe account. You are responsible for any taxes on what you earn.</li>
          </List>
        </Section>

        <Section n={5} title="How you promote">
          <List>
            <li>Say plainly that you earn a commission when you share your links, as the law requires.</li>
            <li>Don't make claims about our work, prices or results that aren't true.</li>
            <li>Don't send spam, buy fake traffic or use any trick to create clicks or sales that aren't real.</li>
            <li>Don't present yourself as {brand} or as speaking for us.</li>
          </List>
        </Section>

        <Section n={6} title="Ending">
          <p>
            You can stop promoting at any time. We may suspend or remove an affiliate who breaks these Terms,
            and we may cancel any commission earned through fraud or a breach of these Terms.
          </p>
        </Section>

        <Section n={7} title="Changes">
          <p>
            We may update these Terms. The date at the top shows when they last changed. If you keep sharing
            your links after a change, the new Terms apply.
          </p>
        </Section>

        <Section n={8} title="Questions">
          <p>
            Reach us through the <Link to="/contact" className="underline hover:text-white">contact page</Link>.
          </p>
        </Section>
      </div>
    </div>
  );
}
