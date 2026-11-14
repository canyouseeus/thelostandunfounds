/**
 * FR33 D. OHM INC. economy — every number that turns into money lives here.
 *
 * Gold is not cash. It redeems into a single-use Stripe promotion code
 * (fixed amount off, minimum order, expiry), usable at any Stripe checkout on
 * the site: gallery photos, prints, event tickets, native shop items.
 * Booking payment links don't accept promo codes, so bookings are excluded.
 */

export const GOLD_PER_DOLLAR = 100;

/** Gold a player gets once per Central day for checking in. */
export const DAILY_GOLD = 25;

/** Bonus gold per confirmed affiliate commission the player's own code earns. */
export const AFFILIATE_QUEST_GOLD = 250;

/** Days a redeemed credit code stays valid. */
export const CREDIT_EXPIRY_DAYS = 90;

/** A credit needs an order of at least this many times its value. $5 → $25. */
export const MIN_ORDER_MULTIPLE = 5;

/** The credit sizes a player can redeem, in gold. */
export const REDEEM_OPTIONS_GOLD = [500, 1000, 2000] as const;

export function goldToCents(gold: number): number {
  return Math.floor((gold * 100) / GOLD_PER_DOLLAR);
}

export function minOrderCents(creditCents: number): number {
  return creditCents * MIN_ORDER_MULTIPLE;
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/** Central calendar day, YYYY-MM-DD (owner rule: days are America/Chicago). */
export function centralDay(d = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}
