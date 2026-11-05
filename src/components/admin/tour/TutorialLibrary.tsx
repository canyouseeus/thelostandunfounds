/**
 * Lists of walkthroughs. With no `dashboard`, every tour on the site — opened
 * from the TUTORIALS tile while SAGE MODE is on and shown on /sagemode, so the
 * owner can run the member and photographer tours too. With a `dashboard`,
 * just that dashboard's tours, for its ? button.
 *
 * Starting one turns SAGE MODE off first: armed, it intercepts every tap, and
 * the tour needs the page to behave normally.
 */

import { CheckIcon } from '@heroicons/react/24/outline';
import { useSageMode } from '../../../contexts/SageModeContext';
import { dashboardOf, DashboardId, DashboardIds, TOURS, Tour } from './tours';
import { useTour } from './TourContext';

const GROUPS: { label: string; match: (t: Tour) => boolean }[] = [
  { label: 'New Features', match: t => dashboardOf(t) === 'admin' && t.group === 'new' },
  { label: 'Dashboard', match: t => dashboardOf(t) === 'admin' && t.group === 'dashboard' },
  { label: 'Platform Console', match: t => dashboardOf(t) === 'admin' && t.group === 'console' },
  { label: 'Member Dashboard', match: t => dashboardOf(t) === 'member' },
  { label: 'Photographer App', match: t => dashboardOf(t) === 'photographer' },
];

const DASHBOARD_LABELS: Record<DashboardId, string> = {
  admin: 'Admin',
  member: 'Your Dashboard',
  photographer: 'Photographer',
};

/** One dashboard: a plain list. Several (a photographer's /dashboard): a heading each. */
function groupsFor(dashboard: DashboardIds) {
  const ids = Array.isArray(dashboard) ? dashboard : [dashboard];
  return ids.map(id => ({
    label: ids.length > 1 ? DASHBOARD_LABELS[id] : '',
    match: (t: Tour) => dashboardOf(t) === id,
  }));
}

export function TutorialList({ onStart, dashboard }: { onStart?: () => void; dashboard?: DashboardIds }) {
  const { start, seen } = useTour();
  const { state, toggleSageMode } = useSageMode();

  const run = (id: string) => {
    if (state.enabled) toggleSageMode();
    onStart?.();
    start(id);
  };

  return (
    <div className="space-y-8">
      {(dashboard ? groupsFor(dashboard) : GROUPS).map(group => {
        const tours = TOURS.filter(group.match);
        if (!tours.length) return null;
        return (
          <div key={group.label}>
            {group.label && (
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-3">{group.label}</h3>
            )}
            <div className="space-y-1">
              {tours.map(t => (
                <button
                  key={t.id}
                  onClick={() => run(t.id)}
                  className="w-full flex items-start gap-3 p-3 bg-white/5 hover:bg-white hover:text-black text-left transition-colors group"
                  style={{ borderRadius: 0 }}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-black uppercase tracking-widest">{t.title}</span>
                    <span className="block text-xs text-white/50 group-hover:text-black/60 mt-1 leading-relaxed">{t.summary}</span>
                  </span>
                  {seen.includes(t.id) && (
                    <CheckIcon className="w-4 h-4 shrink-0 text-white/40 group-hover:text-black/60" aria-label="Done" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
