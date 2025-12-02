import * as React from 'react';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/components/ui/utils';

interface ExpandableScreenProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  triggerRef?: React.RefObject<HTMLElement>;
  className?: string;
}

export function ExpandableScreen({
  isOpen,
  onClose,
  children,
  triggerRef,
  className,
}: ExpandableScreenProps) {
  const screenRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = React.useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [isOpen]);

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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Expanded Screen */}
      <div
        ref={screenRef}
        className={cn(
          'fixed inset-0 z-50',
          'bg-black/95 backdrop-blur-xl',
          'border border-white/10',
          'shadow-2xl',
          isAnimating ? 'animate-in zoom-in-95 duration-300' : '',
          className
        )}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-white/10 border border-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Content */}
        <div className="overflow-y-auto h-full p-6">
          {children}
        </div>
      </div>
    </>
  );
}

