






/**
 * Loading Components
 * Reusable loading spinners and skeleton components
 */

import { ArrowPathIcon } from '@heroicons/react/24/outline';

export function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <ArrowPathIcon className={`${sizes[size]} animate-spin text-white/60 ${className}`} />
  );
}

export function LoadingOverlay({ message }: { message?: string }) {
  // Create 5 blocks for the filling animation
  const blocks = Array.from({ length: 5 });

  return (
    <div className="fixed inset-0 bg-black z-[11000] flex items-center justify-center">
      <div className="flex flex-col items-center gap-8 w-full max-w-[80vw] sm:max-w-md px-4 scale-90 sm:scale-100">
        {/* Logo - Full opacity */}
        <div className="w-full flex justify-center">
          <img
            src="https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/brand-assets/toulouse.png"
            alt="Logo"
            className="w-full h-auto object-contain"
          />
        </div>

        {/* Block Loader - Uses same animation logic as dots */}
        <div className="border border-white p-1 flex gap-1 h-8 w-1/2 bg-black">
          {blocks.map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-white"
              style={{
                animation: 'loading-dot 1.5s infinite',
                animationDelay: `${i * 0.25}s`,
              }}
            />
          ))}
        </div>

        {/* Retro Counter */}
        <div className="text-white font-black tracking-widest text-[10px] uppercase flex items-center gap-1">
          <span>LOADING DATA</span>
          <span className="flex w-6">
            <span className="animate-[loading-dot_1.5s_infinite_0s]">.</span>
            <span className="animate-[loading-dot_1.5s_infinite_0.3s]">.</span>
            <span className="animate-[loading-dot_1.5s_infinite_0.6s]">.</span>
          </span>
        </div>

        {message && <p className="text-white text-[9px] font-black tracking-[0.2em] uppercase opacity-40">{message}</p>}
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
