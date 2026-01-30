import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { cn } from '@/components/ui/utils';

interface AdminBentoCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  rowSpan?: 1 | 2 | 3;
  className?: string;
  action?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function AdminBentoCard({
  title,
  icon,
  children,
  footer,
  colSpan = 1,
  rowSpan = 1,
  className,
  action,
  collapsible = true,
  defaultCollapsed = false
}: AdminBentoCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const colSpanClasses = {
    1: 'md:col-span-1',
    2: 'md:col-span-2',
    3: 'md:col-span-3',
    4: 'md:col-span-4',
    5: 'md:col-span-5',
    6: 'md:col-span-6',
    7: 'md:col-span-7',
    8: 'md:col-span-8',
    9: 'md:col-span-9',
    10: 'md:col-span-10',
    11: 'md:col-span-11',
    12: 'md:col-span-12',
  };

  const rowSpanClasses = {
    1: 'md:row-span-1',
    2: 'md:row-span-2',
    3: 'md:row-span-3',
  };

  // If collapsed, force rowSpan to 1 to avoid empty space
  const currentRowSpan = isCollapsed ? 1 : rowSpan;

  return (
    <div
      className={cn(
        'group relative flex flex-col',
        'bg-black text-white',
        'rounded-none',
        // Blog card-style hover effects - subtle lift
        'transition-all duration-300 ease-out',
        !isCollapsed && 'hover:-translate-y-0.5 hover:scale-[1.01]',
        'hover:bg-[#0a0a0a]',
        !isCollapsed && 'hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]',
        // Mobile: no overflow, allow natural height
        // Desktop: allow overflow for fixed-height grid
        'overflow-visible md:overflow-hidden',
        colSpanClasses[colSpan],
        rowSpanClasses[currentRowSpan],
        className
      )}
    >
      {/* Header - compact on mobile */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 md:px-5 md:py-4 bg-[#0a0a0a]",
          "min-h-[56px] md:min-h-[64px]",
          collapsible && "cursor-pointer select-none"
        )}
        onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
      >
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
        <div className="flex items-center gap-2">
          {action && <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>{action}</div>}
          {collapsible && (
            <ChevronDownIcon
              className={cn(
                "w-4 h-4 text-white/40 transition-transform duration-300",
                isCollapsed ? "" : "rotate-180"
              )}
            />
          )}
        </div>
      </div>

      {/* Content Body */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex-col md:overflow-hidden"
          >
            <div className="flex-1 p-4 md:p-5 flex flex-col">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="mt-auto px-4 py-3 md:px-5 md:py-4 bg-black/30">
                {footer}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface AdminBentoRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
  valueClassName?: string;
  onClick?: () => void;
}

export function AdminBentoRow({ label, value, className, valueClassName, onClick }: AdminBentoRowProps) {
  return (
    <div
      className={cn('flex flex-col py-2 border-0', className)}
      onClick={onClick}
    >
      <span className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-1">{label}</span>
      <span className={cn('text-sm font-medium text-white/90 text-left', valueClassName)}>{value}</span>
    </div>
  );
}




