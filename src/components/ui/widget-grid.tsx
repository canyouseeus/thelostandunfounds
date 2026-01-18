/**
 * WidgetGrid - Draggable widget layout for dashboard
 * Uses dnd-kit for drag-and-drop functionality
 */

import * as React from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from './utils';

// Widget size variants
export type WidgetSize = '1x1' | '2x1' | '1x2' | '2x2' | '3x1' | '3x2' | '4x1';

interface Widget {
    id: string;
    type: string;
    size: WidgetSize;
    title?: string;
}

interface SortableWidgetProps {
    widget: Widget;
    children: React.ReactNode;
    onRemove?: (id: string) => void;
    onResize?: (id: string, size: WidgetSize) => void;
}

function SortableWidget({ widget, children, onRemove, onResize }: SortableWidgetProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: widget.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // Map size to grid classes
    const sizeClasses: Record<WidgetSize, string> = {
        '1x1': 'col-span-1 row-span-1',
        '2x1': 'col-span-2 row-span-1',
        '1x2': 'col-span-1 row-span-2',
        '2x2': 'col-span-2 row-span-2',
        '3x1': 'col-span-3 row-span-1',
        '3x2': 'col-span-3 row-span-2',
        '4x1': 'col-span-4 row-span-1',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'relative group',
                sizeClasses[widget.size],
                // Mobile: always full width
                'col-span-1 md:col-span-auto',
                isDragging && 'z-50 opacity-75',
            )}
        >
            {/* Drag handle - visible on hover */}
            <div
                {...attributes}
                {...listeners}
                className={cn(
                    'absolute top-2 left-2 z-10 p-1.5',
                    'bg-black/80 border border-white/10',
                    'cursor-grab active:cursor-grabbing',
                    'opacity-0 group-hover:opacity-100 transition-opacity',
                )}
            >
                <GripVertical className="w-3 h-3 text-white/50" />
            </div>

            {/* Remove button - visible on hover */}
            {onRemove && (
                <button
                    onClick={() => onRemove(widget.id)}
                    className={cn(
                        'absolute top-2 right-2 z-10 p-1.5',
                        'bg-black/80 border border-white/10 hover:border-red-500/50',
                        'opacity-0 group-hover:opacity-100 transition-opacity',
                    )}
                >
                    <X className="w-3 h-3 text-white/50 hover:text-red-400" />
                </button>
            )}

            {/* Widget content */}
            {children}
        </div>
    );
}

interface WidgetGridProps {
    widgets: Widget[];
    onReorder: (widgets: Widget[]) => void;
    onRemove?: (id: string) => void;
    renderWidget: (widget: Widget) => React.ReactNode;
    className?: string;
}

export function WidgetGrid({
    widgets,
    onReorder,
    onRemove,
    renderWidget,
    className,
}: WidgetGridProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px of movement before activating drag
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = widgets.findIndex((w) => w.id === active.id);
            const newIndex = widgets.findIndex((w) => w.id === over.id);
            const newOrder = arrayMove(widgets, oldIndex, newIndex);
            onReorder(newOrder);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={widgets.map((w) => w.id)}
                strategy={rectSortingStrategy}
            >
                <div
                    className={cn(
                        'grid gap-3 md:gap-4',
                        'grid-cols-1 md:grid-cols-4',
                        'md:auto-rows-[200px]',
                        className
                    )}
                >
                    {widgets.map((widget) => (
                        <SortableWidget
                            key={widget.id}
                            widget={widget}
                            onRemove={onRemove}
                        >
                            {renderWidget(widget)}
                        </SortableWidget>
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}

export type { Widget };
