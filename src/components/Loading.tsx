/**
 * Loading Components
 * Reusable loading spinners and skeleton components
 */

import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <Loader2 className={`${sizes[size]} animate-spin text-white/60 ${className}`} />
  );
}

export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        {message && <p className="text-white/80">{message}</p>}
      </div>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white/10 rounded ${className}`} />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-black/50 border border-white rounded-none p-6">
      <Skeleton className="h-6 w-1/2 mb-4" />
      <SkeletonText lines={3} />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

export function LoadingButton({ 
  loading, 
  children, 
  ...props 
}: { 
  loading?: boolean; 
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`${props.className || ''} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}



export default LoadingOverlay;
