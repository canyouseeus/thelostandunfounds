import * as React from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/components/ui/utils';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: 'left' | 'right';
  title?: string;
  className?: string;
}

export function SidePanel({
  isOpen,
  onClose,
  children,
  side = 'right',
  title,
  className,
}: SidePanelProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (!isOpen) return;

    // Save existing overflow so callers that already lock body scroll aren't clobbered on close
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sideClasses = {
    left: 'left-0',
    right: 'right-0',
  };

  const slideClasses = {
    left: isOpen ? 'translate-x-0' : '-translate-x-full',
    right: isOpen ? 'translate-x-0' : 'translate-x-full',
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99998] animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Panel — sits above the site nav (z-[999]), same pattern as ExpandableScreen */}
      <div
        className={cn(
          'fixed top-0 bottom-0 z-[99999]',
          sideClasses[side],
          'w-full max-w-md',
          'bg-black/95 backdrop-blur-xl',
          'shadow-2xl',
          'flex flex-col',
          'transition-transform duration-300 ease-out',
          slideClasses[side],
          className
        )}
      >
        {/* Header */}
        {(title || true) && (
          <div className="shrink-0 flex items-center justify-between p-6">
            {title && (
              <h2 className="text-xl font-bold text-white">{title}</h2>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-white/70" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-6">
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}
