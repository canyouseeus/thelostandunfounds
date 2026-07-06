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
          {/* Desktop tile */}
          <div className="hidden md:flex flex-col h-full min-h-[190px] bg-black hover:bg-[#0a0a0a] transition-colors duration-300 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white/50 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/80 truncate">{title}</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">{content}</div>
          </div>

          {/* Mobile tile */}
          <div className="flex md:hidden flex-col items-center justify-center p-2.5 bg-white/5 aspect-square w-full active:scale-95 transition-all duration-200">
            <div className="p-2 bg-white/10 rounded-full mb-1">
              <span className="text-white/40 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
            </div>
            <span className="text-[8px] font-black uppercase tracking-[0.05em] text-center leading-tight text-white/60 px-1">
              {titleWords[0]}
            </span>
            {titleWords.length > 1 && (
              <span className="text-[6px] font-bold uppercase tracking-[0.05em] text-center leading-none text-white/30">
                {titleWords.slice(1).join(' ')}
              </span>
            )}
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
