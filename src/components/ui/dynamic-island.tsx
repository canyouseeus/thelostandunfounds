import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/components/ui/utils';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface DynamicIslandProps {
  children?: React.ReactNode;
  expandedContent?: React.ReactNode;
  position?: 'top-center' | 'top-right';
  className?: string;
  defaultExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
}

export function DynamicIsland({
  children,
  expandedContent,
  position = 'top-center',
  className,
  defaultExpanded = false,
  onExpandChange,
}: DynamicIslandProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isHovered, setIsHovered] = useState(false);
  const islandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onExpandChange) {
      onExpandChange(isExpanded);
    }
  }, [isExpanded, onExpandChange]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const positionClasses = {
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
  };

  return (
    <div
      ref={islandRef}
      className={cn(
        'fixed z-50',
        positionClasses[position],
        'transition-all duration-300 ease-out',
        isExpanded
          ? 'w-[90vw] max-w-2xl'
          : isHovered
            ? 'w-64'
            : 'w-32',
        'bg-black/80 backdrop-blur-xl',
        'shadow-[4px_4px_0px_0px_rgba(255,255,255,0.25)]', // 3D Shadow
        !isExpanded && 'hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.35)] hover:-translate-y-[1px]',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        borderRadius: isExpanded ? '0' : '9999px', // Pill shape when collapsed, square when expanded
      }}
    >
      <div
        className={cn(
          'flex items-center justify-between',
          'px-4 py-3',
          'cursor-pointer',
          'transition-all duration-300'
        )}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {children}
        </div>
        {expandedContent && (
          <button
            className="flex-shrink-0 p-1 hover:bg-white/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-white/70" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/70" />
            )}
          </button>
        )}
      </div>
      {isExpanded && expandedContent && (
        <div
          className={cn(
            'px-4 py-4',
            'animate-in slide-in-from-top-2 duration-300'
          )}
        >
          {expandedContent}
        </div>
      )}
    </div>
  );
}

