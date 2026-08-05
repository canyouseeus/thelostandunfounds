/**
 * DEMO MODE — the flag, readable from outside React.
 *
 * `DemoContext` is the React face of this rule and the one components should
 * use. But the payment utilities are plain modules with no hooks and no
 * provider above them, and those are exactly the call sites that must not fire
 * in a demo. So the rule lives here too, and both read the same function.
 *
 * ## Why this is sticky rather than purely derived
 *
 * The first version derived demo mode from the URL alone, on the reasoning that
 * a stored flag can be left on and a URL cannot. That was wrong in practice:
 * the site redirects internally — `/shop` sends you to the homepage, and the
 * redirect rebuilds the query string without `?demo=1`. Demo mode silently
 * turned itself off mid-walkthrough, on the shop, which is the one page where
 * losing it means a real Stripe call. A guard that quietly stops guarding is
 * worse than no guard.
 *
 * So entering demo mode latches it in `sessionStorage`. The properties that
 * matters are kept:
 *
 *   • It cannot leak into normal use — sessionStorage is per-tab and dies with
 *     the tab. Nobody inherits a demo flag from yesterday.
 *   • It cannot be left on by accident — EXIT clears it explicitly, and so does
 *     `?demo=0` for anyone who needs to force it off without closing the tab.
 *   • It still travels in a shared link, because the URL is still what turns it
 *     on in the first place.
 */

const STORAGE_KEY = 'tlu:demo';

function underDemoRoute(pathname: string): boolean {
  return pathname === '/demo' || pathname.startsWith('/demo/');
}

/** Turn the latch off. Wired to the banner's EXIT link. */
export function clearDemoMode(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode, or storage disabled. Nothing to clear; the URL still rules.
  }
}

export function isDemoModeNow(): boolean {
  if (typeof window === 'undefined') return false;

  const { pathname, search } = window.location;
  const param = new URLSearchParams(search).get('demo');

  // An explicit ?demo=0 always wins — the escape hatch that does not require
  // finding the EXIT link or closing the tab.
  if (param === '0') {
    clearDemoMode();
    return false;
  }

  if (underDemoRoute(pathname) || param === '1') {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Storage unavailable — fall through. Demo mode still works for as long
      // as the URL carries it, which is the old behaviour, not a regression.
    }
    return true;
  }

  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Payload the overlay needs to narrate a checkout it just stopped. */
export type DemoCheckoutDetail = {
  /** What the customer thinks they are buying — real product name, real price. */
  label: string;
  amount?: string;
  /** Which rail was invoked: Stripe card, Strike bitcoin, Prodigi print. */
  rail: string;
};

export const DEMO_CHECKOUT_EVENT = 'demo:checkout';

/**
 * Stop a checkout and hand it to the overlay.
 *
 * Returns a promise that never settles, on purpose. The caller is mid-flow with
 * a spinner up and expects to be redirected to a hosted payment page; if this
 * resolved or threw, the caller would either navigate somewhere or show an
 * error, and the demo would look broken instead of looking like checkout. The
 * overlay takes the screen from here and resets the page when it is done, which
 * discards this promise along with everything else.
 */
export function interceptCheckout(detail: DemoCheckoutDetail): Promise<never> {
  window.dispatchEvent(new CustomEvent(DEMO_CHECKOUT_EVENT, { detail }));
  return new Promise<never>(() => {});
}
