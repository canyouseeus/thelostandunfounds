import * as React from 'react';
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
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

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
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
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Expanded Screen */}
            <motion.div
              ref={screenRef}
              layoutId={layoutId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
              className={cn(
                'fixed inset-0 z-[100]',
                'bg-black/95 backdrop-blur-xl',
                'border border-white/10',
                'shadow-2xl'
              )}
              style={{
                borderRadius: contentRadius,
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-20 right-8 z-[110] p-2 bg-black/50 hover:bg-white/10 border border-white/10 transition-colors rounded-none"
              >
                <X className="w-6 h-6 text-white" />
              </button>

              {/* Content */}
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
    <div className={cn('overflow-y-auto h-full p-6', className)}>
      {children}
    </div>
  );
}
