import { useState } from 'react';
import { CalculatorIcon } from '@heroicons/react/24/outline';
import { ExpandableScreen, ExpandableScreenTrigger, ExpandableScreenContent } from '../ui/expandable-screen';
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
 * A single key.
 *
 * Defined at module scope, not inside CalculatorCard. As a nested component it
 * was a new component type on every render, so React unmounted and remounted
 * all twenty buttons whenever any state changed; the click landed on a node
 * that had already been replaced, and the keypad visibly re-rendered under the
 * finger. Hoisting it makes the buttons stable elements that simply re-render.
 */
function Key({ label, onClick, variant = 'default', wide, pressed, onPressStart, onPressEnd }: {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'op' | 'accent';
  wide: boolean;
  pressed: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onPointerDown={onPressStart}
      onPointerUp={onPressEnd}
      onPointerLeave={onPressEnd}
      onPointerCancel={onPressEnd}
      // The grey flash iOS paints over a tapped element, on top of our own
      // press state.
      style={{ WebkitTapHighlightColor: 'transparent' }}
      className={cn(
        'font-mono bg-black select-none',
        // Wide mode gets the room of a full-width row, so the keys grow to a
        // real touch target instead of the 32px a 1/3-width cell allowed.
        wide ? 'h-14 sm:h-16 text-xl sm:text-2xl' : 'h-8 text-[11px]',
        // No key plates. The keypad is type on black; weight and tone carry
        // the hierarchy: operators bright, digits plain, utilities dim.
        variant === 'accent' ? 'font-black text-white'
          : variant === 'op' ? 'font-bold text-white/50'
          : 'font-bold text-white/90',
        // Hover is gated behind a hover-capable pointer. A plain `hover:` sticks
        // after a tap on iOS, leaving a pressed key inverted until you touched
        // something else: the key that "kept blinking with no touches".
        '[@media(hover:hover)]:hover:bg-white [@media(hover:hover)]:hover:text-black',
        // The press state is on while the key is held and off the moment it is
        // released. No transition, so it snaps rather than fading in and out.
        // `:active` can't do this: it fires for a mouse but not for touch, so on
        // a phone the keys had no press feedback at all.
        pressed && '!bg-white !text-black',
      )}
    >
      {label}
    </button>
  );
}

/**
 * Inline calculator widget: same shape and rhythm as ClockWidget and
 * CalendarWidget so the three read as one row: black card, centered content,
 * live and usable in place rather than behind a modal.
 */
export function CalculatorCard({ className, wide = false, compact = false, faceSize = 'sm' }: {
  className?: string;
  wide?: boolean;
  /** Too small for a keypad: show a face that opens the calculator full screen. */
  compact?: boolean;
  /** Which cell the face is filling; 1x1 or a phone's 2x2. */
  faceSize?: 'sm' | 'lg';
}) {
  const [expanded, setExpanded] = useState(false);
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  // After = or an operator, the next digit starts a fresh entry.
  const [fresh, setFresh] = useState(true);
  // Which key is under a finger or a held mouse button. `:active` can't do this
  // job: it fires for a mouse but not for touch, so on a phone the keys had no
  // press feedback at all. Pointer events behave the same for both.
  const [pressed, setPressed] = useState<string | null>(null);

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

  // Local wrapper so the twenty call sites below stay readable.
  const key = (label: string, onClick: () => void, variant?: 'default' | 'op' | 'accent') => (
    <Key
      key={label}
      label={label}
      onClick={onClick}
      variant={variant}
      wide={wide}
      pressed={pressed === label}
      onPressStart={() => setPressed(label)}
      onPressEnd={() => setPressed(null)}
    />
  );

  const keypad = (
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
          {key('AC', clear, 'op')}
          {key('±', () => setDisplay(d => (d.startsWith('-') ? d.slice(1) : d === '0' ? d : '-' + d)), 'op')}
          {key('%', () => { setDisplay(d => fmt(parseFloat(d) / 100)); setFresh(true); }, 'op')}
          {key('÷', () => chooseOp('÷'), 'accent')}

          {['7', '8', '9'].map(d => key(d, () => digit(d)))}
          {key('×', () => chooseOp('×'), 'accent')}

          {['4', '5', '6'].map(d => key(d, () => digit(d)))}
          {key('−', () => chooseOp('-'), 'accent')}

          {['1', '2', '3'].map(d => key(d, () => digit(d)))}
          {key('+', () => chooseOp('+'), 'accent')}

          {key('0', () => digit('0'))}
          {key('.', () => digit('.'))}
          {key('⌫', () => setDisplay(d => (d.length <= 1 || (d.length === 2 && d.startsWith('-')) ? '0' : d.slice(0, -1))), 'op')}
          {key('=', equals, 'accent')}
        </div>
      </div>
    </div>
  );

  // At 1x1 the keys would be a few pixels across; too small to hit and too
  // small to read. The tile becomes a face you tap, and the calculator opens
  // full screen, the same expandable pattern the other widgets use.
  if (compact) {
    return (
      <div className="contents">
        <ExpandableScreen isOpen={expanded} onOpenChange={setExpanded}>
          <ExpandableScreenTrigger className="w-full h-full text-left cursor-pointer">
            {/* The operator quad: plus, divide, equals, times in a two-by-two,
                white on black. Says calculator without a word or a literal
                icon, stays black so it doesn't shout in a field of black tiles,
                and rhymes with the keypad it opens.

                Two type scales because this face now covers two cell sizes;
                1x1 at 81-120px, and 2x2 on a phone at 173px, where a keypad's
                keys would be 39x25 and too small for a thumb. */}
            <div
              className={cn('w-full h-full bg-black grid grid-cols-2 grid-rows-2', className)}
              style={{ borderRadius: 0 }}
            >
              {['+', '÷', '=', '×'].map(op => (
                <span
                  key={op}
                  className="flex items-center justify-center text-white font-black leading-none"
                  style={{ fontSize: faceSize === 'lg' ? 56 : 26 }}
                >
                  {op}
                </span>
              ))}
            </div>
          </ExpandableScreenTrigger>

          <ExpandableScreenContent className="overflow-x-hidden">
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="max-w-2xl mx-auto w-full px-4 sm:px-8 pt-20 pb-16">
                {keypad}
              </div>
            </div>
          </ExpandableScreenContent>
        </ExpandableScreen>
      </div>
    );
  }

  return keypad;
}
