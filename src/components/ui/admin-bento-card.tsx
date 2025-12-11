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
        'group relative flex flex-col overflow-hidden',
        'bg-[#111] text-white',
        'border border-white/10',
        'rounded-none', // Strict rounded-none rule
        'transition-all duration-200',
        // 'hover:border-white/20', // Subtle hover effect - keeping it minimal for now
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5 bg-[#111]">
        <div className="flex items-center gap-3">
          {icon && <div className="text-white/60 group-hover:text-white transition-colors">{icon}</div>}
          <h3 className="font-medium text-sm tracking-wide text-white/90 uppercase">{title}</h3>
        </div>
        {action && <div>{action}</div>}
      </div>

      {/* Content Body */}
      <div className="flex-1 p-6 flex flex-col overflow-y-auto">
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="mt-auto border-t border-white/10 px-6 py-4 bg-[#141414]/50">
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




