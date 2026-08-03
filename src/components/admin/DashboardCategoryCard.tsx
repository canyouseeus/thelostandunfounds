import { useState } from 'react';
import { ExpandableScreen, ExpandableScreenTrigger, ExpandableScreenContent } from '../ui/expandable-screen';

interface DashboardCategoryCardProps {
  icon: React.ReactNode;
  title: string;
  footer?: React.ReactNode;
  content: React.ReactNode;
}

/** Standardized dashboard tile — matches SiteAnalyticsCard's ExpandableScreen pattern. */
export function DashboardCategoryCard({ icon, title, footer, content }: DashboardCategoryCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleWords = title.split(' ');

  return (
    <div className="contents">
      <ExpandableScreen isOpen={isOpen} onOpenChange={setIsOpen}>
        <ExpandableScreenTrigger className="w-full h-full text-left cursor-pointer">
          {/* Square at-a-glance widget — same shape and rhythm as the clock,
              calendar and calculator, showing live figures at every breakpoint
              instead of an icon-only tile. Still opens full screen on click.
              Content is scaled down on mobile so the numbers fit the cell. */}
          <div className="bg-black hover:bg-[#0a0a0a] active:scale-95 transition-all duration-300 aspect-square w-full flex flex-col p-3 md:p-4 overflow-hidden">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 shrink-0">
              <span className="text-white/50 [&>svg]:w-3.5 [&>svg]:h-3.5 md:[&>svg]:w-4 md:[&>svg]:h-4">{icon}</span>
              <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/80 truncate">
                {titleWords[0]}
                {titleWords.length > 1 && (
                  <span className="text-white/40"> {titleWords.slice(1).join(' ')}</span>
                )}
              </h3>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden [zoom:0.72] md:[zoom:1]">{content}</div>
          </div>
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
