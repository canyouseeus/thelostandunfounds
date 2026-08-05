/**
 * DEMO MODE — the strip that never goes away.
 *
 * Fixed, always visible, always says the same thing. The one failure mode that
 * actually costs something is somebody forgetting which mode they are in and
 * either trusting a fake number or expecting a real save. A banner you stop
 * noticing is still doing its job the moment somebody screenshots the page.
 *
 * It sits in two different places, for a reason:
 *
 *   • Under /demo, at the top — the demo shell reserves the space for it.
 *   • On a real page with ?demo=1, at the *bottom* — the shop and the gallery
 *     have their own fixed headers, and a top strip would either cover them or
 *     require every page on the site to learn about demo mode and offset itself.
 *     The bottom is empty on every page and owned by nothing.
 *
 * Per no-border-design: separation is tone, not an outline. Per noir-design:
 * square corners, uppercase, monochrome.
 */

import { Link, useLocation } from 'react-router-dom';
import { DEMO_LAYER } from '../../lib/demo/layers';
import { useDemo } from '../../lib/demo/DemoContext';
import { clearDemoMode } from '../../lib/demo/demoFlag';

export default function DemoBanner({ placement = 'top' }: { placement?: 'top' | 'bottom' }) {
  return (
    <div
      className={`fixed ${placement === 'top' ? 'top-0' : 'bottom-0'} left-0 w-full ${DEMO_LAYER.banner} bg-white text-black`}
      style={{ borderRadius: 0 }}
    >
      <div className="h-8 px-4 sm:px-6 flex items-center justify-between gap-4">
        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] truncate">
          Demo Mode — nothing here saves
        </p>
        <div className="flex items-center gap-5 shrink-0">
          {placement === 'bottom' && (
            <Link
              to="/demo"
              className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] opacity-60 hover:opacity-100 transition-opacity"
            >
              Demo Home
            </Link>
          )}
          {/* Exit is a hard reload, not a client-side Link. Demo mode is
              latched in sessionStorage, and every component that read `isDemo`
              on mount has to be rebuilt from scratch once it is off — a soft
              navigation would leave stale demo state on the page. */}
          <button
            onClick={() => {
              clearDemoMode();
              window.location.href = '/';
            }}
            className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] opacity-60 hover:opacity-100 transition-opacity"
            style={{ borderRadius: 0 }}
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The app-wide mount. Renders only when ?demo=1 put a *real* page into demo
 * mode — under /demo the shell mounts its own at the top, and two banners is
 * worse than none.
 */
export function GlobalDemoBanner() {
  const { isDemo } = useDemo();
  // useLocation, not window.location — the latter is read once at render and
  // would leave the banner stuck in whatever state the first paint saw after a
  // client-side navigation into or out of /demo.
  const { pathname } = useLocation();
  const underDemoRoute = pathname === '/demo' || pathname.startsWith('/demo/');

  if (!isDemo || underDemoRoute) return null;
  return <DemoBanner placement="bottom" />;
}
