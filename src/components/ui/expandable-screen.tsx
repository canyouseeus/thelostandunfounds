import * as React from 'react';
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from './utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ExpandableScreenContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  layoutId?: string;
}

const ExpandableScreenContext = createContext<ExpandableScreenContextValue | null>(null);

function useExpandableScreen() {
  const context = useContext(ExpandableScreenContext);
  if (!context) {
    throw new Error('ExpandableScreen components must be used within ExpandableScreen');
  }
  return context;
}

interface ExpandableScreenProps {
  children: React.ReactNode;
  layoutId?: string;
  triggerRadius?: string;
  contentRadius?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ExpandableScreen({
  children,
  layoutId,
  triggerRadius,
  contentRadius,
  isOpen: controlledIsOpen,
  onOpenChange,
}: ExpandableScreenProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const setIsOpen = (open: boolean) => {
    if (isControlled) {
      onOpenChange?.(open);
    } else {
      setInternalIsOpen(open);
    }
  };

  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (!isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }

    // Save existing overflow so callers (e.g. Admin) can independently lock scroll.
    // documentElement (<html>) is the actual scrolling root in standards mode —
    // locking body alone leaves it scrollable, which on mobile Safari lets touches
    // land on background content behind this fixed-position overlay (taps appear
    // to do nothing because they hit whatever scrolled into that screen position).
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isOpen]);

  // Separate trigger and content from children
  const trigger = React.Children.toArray(children).find(
    (child: any) => child?.type === ExpandableScreenTrigger
  );
  const content = React.Children.toArray(children).find(
    (child: any) => child?.type === ExpandableScreenContent
  );

  const value: ExpandableScreenContextValue = {
    isOpen,
    setIsOpen,
    layoutId,
  };

  return (
    <ExpandableScreenContext.Provider value={value}>
      {trigger}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Expanded Screen — sits above nav (z-[999]) */}
              <motion.div
                ref={screenRef}
                layoutId={layoutId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={cn(
                  'fixed inset-0 z-[99999]',
                  'bg-black',
                  'flex flex-col'
                )}
                style={{ borderRadius: contentRadius }}
              >
                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-6 right-6 z-10 p-2 hover:bg-white/10 transition-all duration-300 ease-out rounded-none group"
                  aria-label="Close"
                >
                  <XMarkIcon className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" />
                </button>

                {/* Content */}
                {content}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </ExpandableScreenContext.Provider>
  );
}

interface ExpandableScreenTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export function ExpandableScreenTrigger({
  children,
  className,
  onClick,
  ...props
}: ExpandableScreenTriggerProps) {
  const { setIsOpen, layoutId } = useExpandableScreen();

  return (
    <motion.button
      layoutId={layoutId}
      onClick={(e) => {
        setIsOpen(true);
        onClick?.(e as any);
      }}
      className={cn('cursor-pointer', className)}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
}

interface ExpandableScreenContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ExpandableScreenContent({
  children,
  className,
}: ExpandableScreenContentProps) {
  return (
    <div className={cn('flex-1 flex flex-col overflow-hidden', className)}>
      {children}
    </div>
  );
}
