/**
 * DEMO MODE — the frame every demo route sits in.
 *
 * Banner on top, section nav under it. The save dialog and the checkout overlay
 * are deliberately *not* here — they mount app-wide in App.tsx, because ?demo=1
 * puts any page on the site into demo mode and those two have to be reachable
 * from the real shop and the real gallery, not just from under /demo.
 */

import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../ui/utils';
import DemoBanner from './DemoBanner';
import { DEMO_LAYER } from '../../lib/demo/layers';

const SECTIONS = [
  { to: '/demo', label: 'Overview', end: true },
  { to: '/demo/dashboard', label: 'Dashboard' },
  { to: '/demo/clients', label: 'Clients' },
  { to: '/demo/signup', label: 'Signup' },
];

export default function DemoShell() {
  return (
    <div className="min-h-screen bg-black">
      <DemoBanner />

      <nav className={`fixed top-8 left-0 w-full ${DEMO_LAYER.nav} bg-[#0a0a0a]`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center gap-6 overflow-x-auto">
          {SECTIONS.map(s => (
            <NavLink
              key={s.to}
              to={s.to}
              end={s.end}
              className={({ isActive }) =>
                cn(
                  'text-[10px] font-black uppercase tracking-[0.25em] whitespace-nowrap transition-colors',
                  isActive ? 'text-white' : 'text-white/30 hover:text-white/70',
                )
              }
            >
              {s.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="pt-20 pb-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
