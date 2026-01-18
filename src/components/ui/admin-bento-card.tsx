import React from 'react';
import { cn } from '@/components/ui/utils';

interface AdminBentoCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3;
  className?: string;
  action?: React.ReactNode;
}

export function AdminBentoCard({
  title,
  icon,
  children,
  footer,
  colSpan = 1,
  rowSpan = 1,
  className,
  action
}: AdminBentoCardProps) {
  const colSpanClasses = {
    1: 'md:col-span-1',
    2: 'md:col-span-2',
    3: 'md:col-span-3',
    4: 'md:col-span-4',
  };

  const rowSpanClasses = {
    1: 'md:row-span-1',
    2: 'md:row-span-2',
    3: 'md:row-span-3',
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col',
        'bg-black text-white',
        'border border-white/[0.08]',
        'rounded-none',
        // Blog card-style hover effects - subtle lift
        'transition-all duration-300 ease-out',
        'hover:-translate-y-0.5 hover:scale-[1.01]',
        'hover:border-white/20 hover:bg-[#0a0a0a]',
        'hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]',
        // Mobile: no overflow, allow natural height
        // Desktop: allow overflow for fixed-height grid
        'overflow-visible md:overflow-hidden',
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        className
      )}
    >
      {/* Header - compact on mobile */}
      <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-4 border-b border-white/[0.06] bg-[#0a0a0a]">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {icon && (
            <div className="text-white/50 group-hover:text-white/80 transition-colors flex-shrink-0">
              {icon}
            </div>
          )}
          <h3 className="font-medium text-xs md:text-sm tracking-wider text-white/80 uppercase truncate">
            {title}
          </h3>
        </div>
        {action && <div className="flex-shrink-0 ml-2">{action}</div>}
      </div>

      {/* Content Body - no scroll on mobile, scroll on desktop if needed */}
      <div className="flex-1 p-4 md:p-5 flex flex-col md:overflow-y-auto">
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="mt-auto border-t border-white/[0.08] px-4 py-3 md:px-5 md:py-4 bg-black/30">
          {footer}
        </div>
      )}
    </div>
  );
}

interface AdminBentoRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
  valueClassName?: string;
}

export function AdminBentoRow({ label, value, className, valueClassName }: AdminBentoRowProps) {
  return (
    <div className={cn('flex items-center justify-between py-2 border-b border-white/5 last:border-0', className)}>
      <span className="text-xs text-white/50 uppercase tracking-wider">{label}</span>
      <span className={cn('text-sm font-medium text-white/90', valueClassName)}>{value}</span>
    </div>
  );
}




