import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from './utils';

interface AnimatedBackgroundProps {
  children: ReactNode;
  defaultValue?: string;
  className?: string;
  transition?: {
    type?: 'spring' | 'tween';
    bounce?: number;
    duration?: number;
  };
  enableHover?: boolean;
  innerClassName?: string;
  activeClassName?: string;
}

export function AnimatedBackground({
  children,
  defaultValue,
  className,
  innerClassName,
  activeClassName,
  transition = {
    type: 'spring',
    bounce: 0.2,
    duration: 0.3,
  },
  enableHover = false,
}: AnimatedBackgroundProps) {
  const [activeId, setActiveId] = useState<string | null>(defaultValue || null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const innerContainerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number; width: number; height: number }>>({});

  // Sync with defaultValue prop
  useEffect(() => {
    if (defaultValue !== undefined) {
      setActiveId(defaultValue);
    }
  }, [defaultValue]);

  // Extract button elements and their IDs from children
  useEffect(() => {
    let rafId: number | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const updatePositions = () => {
      if (!containerRef.current || !innerContainerRef.current) return;

      // Cancel any pending updates
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        const buttons = innerContainerRef.current!.querySelectorAll<HTMLButtonElement>('[data-id]');
        const newPositions: Record<string, { x: number; y: number; width: number; height: number }> = {};

        if (!containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();

        let hasChanges = false;
        const currentPositions = positions; // Use current state

        buttons.forEach((button) => {
          const id = button.getAttribute('data-id');
          if (id) {
            const buttonRect = button.getBoundingClientRect();
            // Calculate position relative to container
            // Use Math.round to avoid sub-pixel positioning issues
            const newPos = {
              x: Math.round(buttonRect.left - containerRect.left),
              y: Math.round(buttonRect.top - containerRect.top),
              width: Math.round(buttonRect.width),
              height: Math.round(buttonRect.height),
            };
            
            newPositions[id] = newPos;

            // Check if changed
            if (!currentPositions[id] || 
                currentPositions[id].x !== newPos.x || 
                currentPositions[id].y !== newPos.y || 
                currentPositions[id].width !== newPos.width || 
                currentPositions[id].height !== newPos.height) {
              hasChanges = true;
            }
          }
        });

        // Also check if any keys were removed
        if (!hasChanges && Object.keys(currentPositions).length !== Object.keys(newPositions).length) {
          hasChanges = true;
        }

        if (hasChanges) {
          setPositions(newPositions);
        }
        rafId = null;
      });
    };

    // Initial update with delay to ensure DOM is ready
    timeoutId = setTimeout(() => {
      updatePositions();
      // Also update after a short delay to catch any layout shifts
      setTimeout(updatePositions, 100);
    }, 10);

    // Debounced resize handler
    let resizeTimeout: NodeJS.Timeout | null = null;
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updatePositions, 150);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [children]);


  // Handle click events from children
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest('[data-id]') as HTMLButtonElement;
      if (button) {
        const id = button.getAttribute('data-id');
        if (id) {
          setActiveId(id);
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('click', handleClick);
      return () => container.removeEventListener('click', handleClick);
    }
  }, []);

  // Handle hover events - attach directly to buttons
  useEffect(() => {
    if (!enableHover || !innerContainerRef.current) return;

    const buttons = innerContainerRef.current.querySelectorAll<HTMLButtonElement>('[data-id]');
    const handlers: Array<{ button: HTMLButtonElement; enter: () => void; leave: () => void }> = [];

    buttons.forEach((button) => {
      const id = button.getAttribute('data-id');
      if (!id) return;

      const handleEnter = () => {
        setHoveredId(id);
      };

      const handleLeave = () => {
        setHoveredId(null);
      };

      button.addEventListener('mouseenter', handleEnter);
      button.addEventListener('mouseleave', handleLeave);
      
      handlers.push({ button, enter: handleEnter, leave: handleLeave });
    });

    return () => {
      handlers.forEach(({ button, enter, leave }) => {
        button.removeEventListener('mouseenter', enter);
        button.removeEventListener('mouseleave', leave);
      });
    };
  }, [enableHover, children, positions]);

  const displayId = enableHover && hoveredId ? hoveredId : activeId;
  const position = displayId ? positions[displayId] : null;

  return (
    <div ref={containerRef} className={cn('relative flex flex-row items-center gap-2', className)}>
      {position && (
        <motion.div
          className={cn("absolute bg-white/10 rounded-none pointer-events-none", activeClassName)}
          style={{ 
            zIndex: 0,
            left: 0,
            top: 0,
          }}
          initial={false}
          animate={{
            x: position.x,
            y: position.y,
            width: position.width,
            height: position.height,
          }}
          transition={{
            ...transition,
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
        />
      )}
      <div ref={innerContainerRef} className={cn("relative z-10 flex flex-row items-center gap-2 flex-nowrap min-w-0", innerClassName)}>
        {children}
      </div>
    </div>
  );
}

