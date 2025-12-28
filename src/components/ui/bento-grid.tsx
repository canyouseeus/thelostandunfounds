import * as React from 'react';
import { cn } from '@/components/ui/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface BentoCardProps {
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3;
  className?: string;
  children: React.ReactNode;
  expandable?: boolean;
  expandedContent?: React.ReactNode;
  defaultExpanded?: boolean;
}

export function BentoCard({
  colSpan = 1,
  rowSpan = 1,
  className,
  children,
  expandable = false,
  expandedContent,
  defaultExpanded = false,
}: BentoCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const handleToggle = (e: React.MouseEvent) => {
    if (expandable) {
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div
      className={cn(
        'bg-[#111] text-white',
        'p-4',
        'rounded-none',
        'border border-white/10',
        expandable && 'cursor-pointer relative',
        isExpanded && expandable && 'bg-[#141414]',
        className
      )}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: isExpanded && expandable ? `span ${rowSpan + 1}` : `span ${rowSpan}`,
      }}
    >
      {expandable && (
        <button
          className={cn(
            'absolute top-4 right-4 p-1.5 hover:bg-white/10 transition-colors rounded',
            'text-white/60 hover:text-white z-10'
          )}
          onClick={handleToggle}
          aria-label={isExpanded ? 'Collapse card' : 'Expand card'}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      )}
      <div className={expandable ? 'pr-8' : ''}>
        {children}
      </div>
      {expandable && isExpanded && expandedContent && (
        <div
          className={cn(
            'mt-4 pt-4 border-t border-white/10',
            'animate-in fade-in slide-in-from-top-2 duration-300'
          )}
        >
          {expandedContent}
        </div>
      )}
    </div>
  );
}

interface BentoGridProps {
  columns?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
}

const gapClasses = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

export function BentoGrid({
  columns = 4,
  gap = 'md',
  className,
  children,
}: BentoGridProps) {
  const columnClasses = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div
      className={cn(
        'grid',
        columnClasses[columns],
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

