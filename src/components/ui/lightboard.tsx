import { ReactNode } from 'react';

interface LightBoardProps {
  className?: string;
  label?: ReactNode;
  labelWidth?: number;
  children?: ReactNode;
}

export function LightBoard({ className = '', label, labelWidth = 68, children }: LightBoardProps) {
  return (
    <div
      className={`flex items-stretch bg-black overflow-hidden ${className}`}
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '4px 4px',
      }}
    >
      {label !== undefined && (
        <div
          className="flex items-center justify-center shrink-0 bg-black/60"
          style={{ width: labelWidth }}
        >
          {label}
        </div>
      )}
      <div className="flex-1 relative overflow-hidden">{children}</div>
    </div>
  );
}

export default LightBoard;
