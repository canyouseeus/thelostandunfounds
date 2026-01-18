/**
 * CollapsibleSection - Dashboard section with triangle expand/collapse
 * Similar to nav menu expand behavior
 */

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from './utils';

interface CollapsibleSectionProps {
    title: string;
    icon?: React.ReactNode;
    badge?: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
    isOpen?: boolean;
    onToggle?: () => void;
    className?: string;
}

export function CollapsibleSection({
    title,
    icon,
    badge,
    children,
    defaultOpen = false,
    isOpen: controlledIsOpen,
    onToggle,
    className,
}: CollapsibleSectionProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);

    const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
    const handleToggle = () => {
        if (onToggle) {
            onToggle();
        } else {
            setInternalIsOpen(!isOpen);
        }
    };

    return (
        <div
            className={cn(
                'bg-black transition-all duration-300',
                'hover:bg-white/[0.02]',
                className
            )}
        >
            {/* Header - clickable to toggle */}
            <button
                onClick={handleToggle}
                className="w-full flex items-center justify-between p-4 text-left group"
            >
                <div className="flex items-center gap-3">
                    {/* Triangle toggle icon */}
                    <ChevronRight
                        className={cn(
                            'w-4 h-4 text-white/40 transition-transform duration-200',
                            isOpen && 'rotate-90'
                        )}
                    />
                    {icon && (
                        <div className="text-white/50 group-hover:text-white/80 transition-colors">
                            {icon}
                        </div>
                    )}
                    <span className="text-sm font-medium text-white/80 uppercase tracking-wider">
                        {title}
                    </span>
                </div>
                {badge && <div className="flex-shrink-0">{badge}</div>}
            </button>

            {/* Collapsible Content */}
            <div
                className={cn(
                    'overflow-hidden transition-all duration-300 ease-out',
                    isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                )}
            >
                <div className="pt-2 px-4 pb-4">
                    {children}
                </div>
            </div>
        </div>
    );
}
