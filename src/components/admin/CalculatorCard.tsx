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
export function CalculatorCard({ className, wide = false }: { className?: string; wide?: boolean }) {
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
      // The grey flash iOS paints over a tapped element, on top of our own
      // press state.
      style={{ WebkitTapHighlightColor: 'transparent' }}
      className={cn(
        'font-mono bg-black select-none',
        // Press feedback is :active only — it ends when the finger lifts.
        // transition-colors made the release fade out, which read as a blink.
        'active:bg-white active:text-black',
        // Wide mode gets the room of a full-width row, so the keys grow to a
        // real touch target instead of the 32px a 1/3-width cell allowed.
        wide ? 'h-14 sm:h-16 text-xl sm:text-2xl' : 'h-8 text-[11px]',
        // No key plates. The keypad is type on black — weight and tone carry
        // the hierarchy (operators bright, digits plain, utilities dim).
        //
        // Hover is gated behind a real hover-capable pointer. A plain `hover:`
        // sticks after a tap on iOS, so a key you pressed stayed inverted until
        // you touched something else — the key that "kept blinking with no
        // touches". Touch gets `active:` above instead, which ends on release.
        variant === 'accent' ? 'font-black text-white'
          : variant === 'op' ? 'font-bold text-white/50'
          : 'font-bold text-white/90',
        '[@media(hover:hover)]:hover:bg-white [@media(hover:hover)]:hover:text-black',
      )}
    >
      {label}
    </button>
  );

  return (
    <div className={cn(
      'bg-black flex flex-col items-center justify-center',
      // The 280px floor was sized for the old third-width cell. In a full-width
      // row the keypad is already taller than that, so the floor only added a
      // band of empty black above the display.
      wide ? 'p-4 min-h-0' : 'p-6 min-h-[280px]',
      className,
    )}>
      <div className={cn('w-full', wide ? 'max-w-[640px]' : 'max-w-[240px]')}>
        <div className={cn('text-right', wide ? 'mb-5' : 'mb-3')}>
          <div className="text-[10px] font-mono text-white/30 h-3 leading-none">{op ?? ''}</div>
          <div className={cn(
            'font-black font-mono text-white tabular-nums truncate',
            wide ? 'text-5xl sm:text-6xl' : 'text-3xl',
          )}>
            {display}
          </div>
        </div>

        <div className={cn('grid grid-cols-4', wide ? 'gap-1' : 'gap-1.5')}>
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
