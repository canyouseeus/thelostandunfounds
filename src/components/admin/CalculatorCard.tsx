import { useState } from 'react';
import { cn } from '../ui/utils';

type Op = '+' | '-' | '×' | '÷';

const apply = (a: number, b: number, op: Op) => {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return b === 0 ? NaN : a / b;
  }
};

/** Trims float noise (0.1 + 0.2) without forcing decimals on whole numbers. */
const fmt = (n: number) => {
  if (!Number.isFinite(n)) return 'Error';
  return String(Math.round(n * 1e10) / 1e10);
};

/**
 * Inline calculator widget — same shape and rhythm as ClockWidget and
 * CalendarWidget so the three read as one row: black card, centered content,
 * live and usable in place rather than behind a modal.
 */
export function CalculatorCard({ className }: { className?: string }) {
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  // After = or an operator, the next digit starts a fresh entry.
  const [fresh, setFresh] = useState(true);

  const digit = (d: string) => {
    setDisplay(prev => {
      if (fresh) return d === '.' ? '0.' : d;
      if (d === '.' && prev.includes('.')) return prev;
      if (prev === '0' && d !== '.') return d;
      return prev + d;
    });
    setFresh(false);
  };

  const chooseOp = (next: Op) => {
    const current = parseFloat(display);
    if (acc !== null && op && !fresh) {
      const result = apply(acc, current, op);
      setAcc(result);
      setDisplay(fmt(result));
    } else {
      setAcc(current);
    }
    setOp(next);
    setFresh(true);
  };

  const equals = () => {
    if (acc === null || !op) return;
    const result = apply(acc, parseFloat(display), op);
    setDisplay(fmt(result));
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const clear = () => { setDisplay('0'); setAcc(null); setOp(null); setFresh(true); };

  const Key = ({ label, onClick, variant = 'default' }: {
    label: string; onClick: () => void; variant?: 'default' | 'op' | 'accent';
  }) => (
    <button
      onClick={onClick}
      className={cn(
        'h-8 text-[11px] font-bold font-mono transition-colors active:scale-95',
        variant === 'accent' ? 'bg-white/90 text-black hover:bg-white'
          : variant === 'op' ? 'bg-white/10 text-white hover:bg-white/20'
          : 'bg-white/5 text-white hover:bg-white/10',
      )}
    >
      {label}
    </button>
  );

  return (
    <div className={cn(
      'bg-black p-6 flex flex-col items-center justify-center min-h-[280px]',
      className,
    )}>
      <div className="w-full max-w-[240px]">
        <div className="text-right mb-3">
          <div className="text-[10px] font-mono text-white/30 h-3 leading-none">{op ?? ''}</div>
          <div className="text-3xl font-black font-mono text-white tabular-nums truncate">
            {display}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <Key label="AC" onClick={clear} variant="op" />
          <Key label="±" onClick={() => setDisplay(d => (d.startsWith('-') ? d.slice(1) : d === '0' ? d : '-' + d))} variant="op" />
          <Key label="%" onClick={() => { setDisplay(d => fmt(parseFloat(d) / 100)); setFresh(true); }} variant="op" />
          <Key label="÷" onClick={() => chooseOp('÷')} variant="accent" />

          {['7', '8', '9'].map(d => <Key key={d} label={d} onClick={() => digit(d)} />)}
          <Key label="×" onClick={() => chooseOp('×')} variant="accent" />

          {['4', '5', '6'].map(d => <Key key={d} label={d} onClick={() => digit(d)} />)}
          <Key label="−" onClick={() => chooseOp('-')} variant="accent" />

          {['1', '2', '3'].map(d => <Key key={d} label={d} onClick={() => digit(d)} />)}
          <Key label="+" onClick={() => chooseOp('+')} variant="accent" />

          <Key label="0" onClick={() => digit('0')} />
          <Key label="." onClick={() => digit('.')} />
          <Key label="⌫" onClick={() => setDisplay(d => (d.length <= 1 || (d.length === 2 && d.startsWith('-')) ? '0' : d.slice(0, -1)))} variant="op" />
          <Key label="=" onClick={equals} variant="accent" />
        </div>
      </div>
    </div>
  );
}
