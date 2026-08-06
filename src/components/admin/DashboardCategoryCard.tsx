import { useState } from 'react';
import { DashboardTile } from './DashboardTile';
import { ExpandableScreen, ExpandableScreenTrigger, ExpandableScreenContent } from '../ui/expandable-screen';

interface DashboardCategoryCardProps {
  icon: React.ReactNode;
  title: string;
  footer?: React.ReactNode;
  /** The expanded panel's body. */
  content: React.ReactNode;
  /** The headline figure on the tile face. */
  primary: React.ReactNode;
  /** A few words under the figure. */
  caption: string;
  /** Optional small figures above the headline. */
  aside?: React.ReactNode;
  /** Grid shape, e.g. "col-span-2 row-span-2". See the dashboard grid. */
  span?: string;
  /** White tile, black type. */
  light?: boolean;
  /** Current shape, e.g. '2x2'. */
  size?: string;
}

/** Standardized dashboard tile — matches SiteAnalyticsCard's ExpandableScreen pattern. */
export function DashboardCategoryCard({ icon, title, footer, content, span, primary, caption, aside, light, size }: DashboardCategoryCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="contents">
      <ExpandableScreen isOpen={isOpen} onOpenChange={setIsOpen}>
        {/* `block w-full h-full` is what makes these tiles fill their cell. The
            trigger is a button — inline-block, height from its content — so the
            tile's own h-full resolved against a box the size of the text and the
            widget sat short in a full-height cell, unlike the drawn widgets. */}
        <ExpandableScreenTrigger className={`block w-full h-full text-left cursor-pointer ${span ?? ''}`}>
          {/* At-a-glance face; opens full screen on click. */}
          <DashboardTile light={light} size={size} icon={icon} primary={primary} caption={caption}>
            {aside}
          </DashboardTile>
        </ExpandableScreenTrigger>

        <ExpandableScreenContent className="overflow-x-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 pt-20 pb-16">
              <div className="flex items-center gap-3 mb-8">
                <span className="text-white/40 [&>svg]:w-5 [&>svg]:h-5">{icon}</span>
                <h2 className="text-xl font-black uppercase tracking-wide text-white">{title}</h2>
              </div>
              <div className="bg-white/5 p-6">{content}</div>
              {footer && <div className="mt-6 text-white/40 text-xs normal-case">{footer}</div>}
            </div>
          </div>
        </ExpandableScreenContent>
      </ExpandableScreen>
    </div>
  );
}
