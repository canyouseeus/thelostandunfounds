import { ReactNode, useState } from 'react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

/**
 * The shared card-stack explorer every widget's expanded card navigates with:
 * a stack of cards, a back control that always returns to the card you came
 * from, and, from the root card, a labelled way back to the dashboard.
 * Registry drills census → category → item; revenue will drill waterfall →
 * source → transaction; each widget defines only its tree.
 */
export interface StackNav {
  push: (card: StackCard) => void;
  pop: () => void;
  close: () => void;
}

export interface StackCard {
  title: string;
  render: (nav: StackNav) => ReactNode;
}

export function CardStack({ root, rootBackLabel = 'Dashboard', onClose }: {
  root: StackCard;
  /** What the back control says on the root card; where closing lands you. */
  rootBackLabel?: string;
  onClose: () => void;
}) {
  const [stack, setStack] = useState<StackCard[]>([root]);
  const top = stack[stack.length - 1];

  const nav: StackNav = {
    push: card => setStack(st => [...st, card]),
    pop: () => setStack(st => (st.length > 1 ? st.slice(0, -1) : st)),
    close: onClose,
  };

  const backLabel = stack.length === 1 ? rootBackLabel : stack[stack.length - 2].title;

  return (
    <div className="text-left">
      <button
        onClick={() => (stack.length === 1 ? onClose() : nav.pop())}
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white transition-colors mb-4"
      >
        <ArrowRightIcon className="w-3 h-3 rotate-180" />
        {backLabel}
      </button>
      <h2 className="text-lg font-black uppercase tracking-widest text-white pr-10 mb-4 truncate">{top.title}</h2>
      {top.render(nav)}
    </div>
  );
}

/** A row that pushes deeper: the stack's standard list item. */
export function StackRow({ label, value, sub, onPress }: {
  label: string;
  value?: string;
  sub?: string;
  onPress?: () => void;
}) {
  return (
    <button
      onClick={onPress}
      disabled={!onPress}
      className={[
        'w-full flex items-baseline justify-between gap-3 px-3 py-2.5 bg-white/[0.03] text-left',
        onPress ? 'hover:bg-white/10 transition-colors cursor-pointer' : '',
      ].join(' ')}
      style={{ borderRadius: 0 }}
    >
      <span className="min-w-0">
        <span className="block text-xs text-white truncate">{label}</span>
        {sub && <span className="block text-[10px] text-white/40 truncate">{sub}</span>}
      </span>
      <span className="flex items-center gap-2 shrink-0">
        {value && <span className="text-sm font-bold text-white tabular-nums">{value}</span>}
        {onPress && <ArrowRightIcon className="w-3 h-3 text-white/30" />}
      </span>
    </button>
  );
}

/** The leaf card: a thing's fields, one per row. */
export function FieldsCard({ fields }: { fields: Record<string, string> }) {
  return (
    <div className="space-y-px">
      {Object.entries(fields).map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 px-3 py-2.5 bg-white/[0.03]">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{k}</span>
          <span className="text-sm text-white text-right break-all">{v}</span>
        </div>
      ))}
    </div>
  );
}
