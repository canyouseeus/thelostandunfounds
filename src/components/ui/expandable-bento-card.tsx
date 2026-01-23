import React from 'react';
import { cn } from '@/components/ui/utils';
import {
    Expandable,
    ExpandableTrigger,
    ExpandableCard,
    ExpandableCardHeader,
    ExpandableCardContent,
    ExpandableContent,
} from './expandable';
import { ChevronDown } from 'lucide-react';

interface ExpandableBentoCardProps {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    details?: React.ReactNode;
    footer?: React.ReactNode;
    colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    rowSpan?: 1 | 2 | 3;
    className?: string;
    action?: React.ReactNode;
}

export function ExpandableBentoCard({
    title,
    icon,
    children,
    details,
    footer,
    colSpan = 1,
    rowSpan = 1,
    className,
    action
}: ExpandableBentoCardProps) {
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

    // If no details, render a static card (mimicking AdminBentoCard but ensuring consistent styling)
    if (!details) {
        return (
            <div
                className={cn(
                    'group relative flex flex-col',
                    'bg-black text-white',
                    'rounded-none',
                    'overflow-visible md:overflow-hidden',
                    colSpanClasses[colSpan],
                    rowSpanClasses[rowSpan],
                    className
                )}
            >
                <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-4 bg-[#0a0a0a]">
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
                <div className="flex-1 p-4 md:p-5 flex flex-col md:overflow-y-auto">
                    {children}
                </div>
                {footer && (
                    <div className="mt-auto px-4 py-3 md:px-5 md:py-4 bg-black/30">
                        {footer}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={cn(colSpanClasses[colSpan], rowSpanClasses[rowSpan])}>
            <Expandable expandDirection="vertical" expandBehavior="push">
                {({ isExpanded }) => (
                    <ExpandableTrigger>
                        <ExpandableCard
                            className={cn(
                                'group relative flex flex-col w-full h-full',
                                'bg-black text-white',
                                'rounded-none',
                                'transition-all duration-300 ease-out',
                                'hover:bg-[#0a0a0a]',
                                className
                            )}
                            collapsedSize={{ width: '100%', height: 'auto' }}
                            expandedSize={{ width: '100%', height: 'auto' }}
                            hoverToExpand={false}
                        >
                            <ExpandableCardHeader className="px-4 py-3 md:px-5 md:py-4 bg-[#0a0a0a] rounded-none">
                                <div className="flex items-center justify-between w-full">
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
                                        {action && <div className="flex-shrink-0">{action}</div>}
                                        <ChevronDown
                                            className={cn(
                                                "w-4 h-4 text-white/40 transition-transform duration-300",
                                                isExpanded ? "rotate-180" : ""
                                            )}
                                        />
                                    </div>
                                </div>
                            </ExpandableCardHeader>

                            <ExpandableCardContent className="p-4 md:p-5 flex-1 rounded-none">
                                {children}
                                <ExpandableContent>
                                    <div className="pt-4 mt-4 border-t border-white/10 space-y-4">
                                        {details}
                                    </div>
                                </ExpandableContent>
                            </ExpandableCardContent>

                            {footer && (
                                <div className="mt-auto px-4 py-3 md:px-5 md:py-4 bg-black/30">
                                    {footer}
                                </div>
                            )}
                        </ExpandableCard>
                    </ExpandableTrigger>
                )}
            </Expandable>
        </div>
    );
}
