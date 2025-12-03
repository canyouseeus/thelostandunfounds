import * as React from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';
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

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 bottom-0 z-50',
          sideClasses[side],
          'w-full max-w-md',
          'bg-black/95 backdrop-blur-xl',
          'border border-white',
          'shadow-2xl',
          'transition-transform duration-300 ease-out',
          slideClasses[side],
          className
        )}
      >
        {/* Header */}
        {(title || true) && (
          <div className="flex items-center justify-between p-6 border-b border-white">
            {title && (
              <h2 className="text-xl font-bold text-white">{title}</h2>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto h-full pb-6">
          {children}
        </div>
      </div>
    </>
  );
}

