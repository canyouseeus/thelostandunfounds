import { useState, useEffect, useRef } from 'react';
import { cn } from '@/components/ui/utils';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  format?: 'number' | 'currency' | 'percentage';
  currency?: string;
}

export function AnimatedNumber({
  value,
  duration = 1000,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  format = 'number',
  currency = '$',
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startValueRef = useRef(0);
  const targetValueRef = useRef(value);

  useEffect(() => {
    startValueRef.current = displayValue;
    targetValueRef.current = value;
    startTimeRef.current = null;

    const animate = (currentTime: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentValue =
        startValueRef.current +
        (targetValueRef.current - startValueRef.current) * easeOut;

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValueRef.current);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration]);

  const formatNumber = (num: number): string => {
    let formatted = num.toFixed(decimals);

    if (format === 'currency') {
      formatted = `${currency}${formatted}`;
    } else if (format === 'percentage') {
      formatted = `${formatted}%`;
    }

    // Add commas for thousands
    if (decimals === 0) {
      formatted = Math.round(num).toLocaleString();
      if (format === 'currency') {
        formatted = `${currency}${Math.round(num).toLocaleString()}`;
      } else if (format === 'percentage') {
        formatted = `${Math.round(num).toLocaleString()}%`;
      }
    } else {
      const parts = formatted.split('.');
      parts[0] = parseInt(parts[0]).toLocaleString();
      formatted = parts.join('.');
      if (format === 'currency') {
        formatted = `${currency}${parts[0]}.${parts[1]}`;
      } else if (format === 'percentage') {
        formatted = `${parts[0]}.${parts[1]}%`;
      }
    }

    return `${prefix}${formatted}${suffix}`;
  };

  return (
    <span className={cn('tabular-nums', className)}>
      {formatNumber(displayValue)}
    </span>
  );
}

