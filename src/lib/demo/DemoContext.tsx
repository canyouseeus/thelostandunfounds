/**
 * DEMO MODE — the flag, and the write interceptor.
 *
 * Two things live here:
 *
 *   1. `isDemo` — true under the /demo route tree, or anywhere with ?demo=1.
 *      Components read it to decide whether to source fixtures instead of
 *      Supabase. It is derived from the URL rather than stored, so a shared
 *      link always lands the other person in the same mode.
 *
 *   2. `intercept()` — the reason demo mode is safe. A form in demo mode runs
 *      its full submit path: validation, the disabled/submitting state, the
 *      success screen. Then the payload is handed here instead of to the
 *      database, and thrown away. The user is shown exactly what would have
 *      been written and where, and the form resets to the beginning either way.
 *
 * The interceptor is deliberately the only path a demo write can take. There is
 * no "unless" branch: if `isDemo` is true, nothing reaches Supabase from a form,
 * because the form never gets to call Supabase in the first place — it calls
 * `intercept` and awaits a decision that resolves locally.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { isDemoModeNow } from './demoFlag';

/** What a demo write *would* have done, shown to the user instead of doing it. */
export type DemoWrite = {
  /** Human label for the action — "Create client", "Send message". */
  action: string;
  /** The table the real write would have targeted. */
  table: string;
  /** The payload the real write would have carried. */
  payload: Record<string, unknown>;
};

type DemoContextValue = {
  isDemo: boolean;
  /** The write awaiting a decision, if any — drives the dialog. */
  pending: DemoWrite | null;
  /**
   * Hand a payload here instead of writing it. Resolves `true` if the user
   * chose SAVE (which still writes nothing) and `false` if they discarded.
   * Either way the caller resets its form — the resolved value only decides
   * whether the success state flashes first.
   */
  intercept: (write: DemoWrite) => Promise<boolean>;
  /** Resolve the pending write. Called by the dialog, not by forms. */
  resolve: (saved: boolean) => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [pending, setPending] = useState<DemoWrite | null>(null);
  // The resolver for the in-flight intercept. Held in state rather than a ref
  // so a stale resolver can never be called twice after a remount.
  const [resolver, setResolver] = useState<((saved: boolean) => void) | null>(null);

  // Delegates to `isDemoModeNow` rather than re-deriving from `location`, so
  // React and the payment guards can never disagree about whether this is a
  // demo — one rule, one implementation. `location` is still a dependency
  // because it is what makes this recompute on navigation.
  const isDemo = useMemo(
    () => isDemoModeNow(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location.pathname, location.search],
  );

  const intercept = useCallback((write: DemoWrite) => {
    setPending(write);
    return new Promise<boolean>(resolve => {
      // Wrapped in a thunk — setState treats a bare function as an updater.
      setResolver(() => resolve);
    });
  }, []);

  const resolve = useCallback((saved: boolean) => {
    resolver?.(saved);
    setResolver(null);
    setPending(null);
  }, [resolver]);

  const value = useMemo(
    () => ({ isDemo, pending, intercept, resolve }),
    [isDemo, pending, intercept, resolve],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

/**
 * Read demo state. Safe outside the provider — returns `isDemo: false` and an
 * intercept that refuses, so a component that forgets the provider fails loudly
 * at the write rather than silently writing to production.
 */
export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (ctx) return ctx;
  return {
    isDemo: false,
    pending: null,
    intercept: () => {
      throw new Error('useDemo().intercept called outside DemoProvider — refusing to guess whether this is a demo.');
    },
    resolve: () => {},
  };
}

/**
 * Pick between live data and a fixture in one expression, so a component reads
 * the same either way:
 *
 *   const clients = useDemoData(DEMO_CLIENTS, liveClients)
 */
export function useDemoData<T>(fixture: T, live: T): T {
  const { isDemo } = useDemo();
  return isDemo ? fixture : live;
}
