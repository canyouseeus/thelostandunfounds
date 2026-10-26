/**
 * The list of every admin walkthrough — opened from the TUTORIALS tile while
 * SAGE MODE is on, and shown on the /sagemode page.
 *
 * Starting one turns SAGE MODE off first: armed, it intercepts every tap, and
 * the tour needs the page to behave normally.
 */

import { CheckIcon } from '@heroicons/react/24/outline';
import { useSageMode } from '../../../contexts/SageModeContext';
import { TOURS, Tour } from './tours';
import { useTour } from './TourContext';

const GROUPS: { id: Tour['group']; label: string }[] = [
  { id: 'new', label: 'New Features' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'console', label: 'Platform Console' },
];

export function TutorialList({ onStart }: { onStart?: () => void }) {
  const { start, seen } = useTour();
  const { state, toggleSageMode } = useSageMode();

  const run = (id: string) => {
    if (state.enabled) toggleSageMode();
    onStart?.();
    start(id);
  };

  return (
    <div className="space-y-8">
      {GROUPS.map(group => {
        const tours = TOURS.filter(t => t.group === group.id);
        if (!tours.length) return null;
        return (
          <div key={group.id}>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-3">{group.label}</h3>
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
