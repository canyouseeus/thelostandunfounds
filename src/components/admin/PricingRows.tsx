/**
 * Gallery pricing rows (owner, 2026-11-02): every price in one PRICING section,
 * one layout — label left, $ box right, never wrapping on a phone.
 *
 * Bundles also do the arithmetic (owner, 2026-11-04: "I have to use a
 * calculator for setting prices for bundles"): each shows its price per photo
 * and what it saves against singles, and has a % OFF box — type a percent and
 * the price is set from the per-photo price; type a price and the percent
 * follows.
 */
// --- Pricing rows (one layout for every price; label left, box right) --------
import { useState } from 'react';
import NumberField from '../ui/NumberField';

export const PRICE_GROUP = 'text-[10px] font-black uppercase tracking-[0.2em] text-white/70';
const PRICE_LABEL = 'text-[10px] font-black uppercase tracking-[0.2em] text-white/40 whitespace-nowrap';
const PRICE_INPUT = 'bg-white/5 rounded-none px-2 py-1.5 text-sm text-white font-bold font-mono focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => `$${round2(n).toFixed(2).replace(/\.00$/, '')}`;

/** What `count` photos for `price` works out to against `single` each. */
export function bundleMath(count: number, price: number, single: number) {
    if (!(count > 0) || !(price >= 0)) return null;
    const full = count * single;
    return {
        perPhoto: price / count,
        full,
        saves: full - price,
        pctOff: full > 0 ? (1 - price / full) * 100 : null,
    };
}

/** "$6.25 / photo · saves $15 vs $40" — red when it costs more than singles. */
function MathLine({ count, price, single }: { count: number; price: number; single: number }) {
    const m = bundleMath(count, price, single);
    if (!m) return null;
    const parts = [`${money(m.perPhoto)} / photo`];
    let warn = false;
    if (m.full > 0) {
        if (m.saves > 0.004) parts.push(`saves ${money(m.saves)} vs ${money(m.full)}`);
        else if (m.saves < -0.004) { parts.push(`${money(-m.saves)} more than ${count} singles`); warn = true; }
        else parts.push('same as singles');
    }
    return (
        <p className={`text-right pr-7 mt-1 text-[10px] font-mono ${warn ? 'text-red-400' : 'text-white/40'}`}>
            {parts.join(' · ')}
        </p>
    );
}

export function PriceRow({ label, value, onChange, placeholder, tour, count, single }: {
    label: string;
    value: number | '';
    onChange: (v: number | '') => void;
    placeholder?: string;
    tour?: string;
    /** Photos this price buys (the whole album) — shows per-photo and savings under it. */
    count?: number;
    /** The per-photo price to compare against. */
    single?: number;
}) {
    return (
        <div data-tour={tour}>
            <div className="flex items-center justify-between gap-3">
                <span className={PRICE_LABEL}>{label}</span>
                <div className="flex items-center gap-1">
                    <span className="text-xs text-white/40">$</span>
                    <NumberField
                        value={value}
                        placeholder={placeholder}
                        onChange={onChange}
                        aria-label={label}
                        className={`w-24 text-right ${PRICE_INPUT}`}
                    />
                    {/* Same width as a bundle row's ×, so every box lines up. */}
                    <span className="w-6" aria-hidden />
                </div>
            </div>
            {value !== '' && value > 0 && count != null && count > 0 && single != null && (
                <MathLine count={count} price={value} single={single} />
            )}
        </div>
    );
}

/** % OFF box: typing a percent sets the price; otherwise it shows what the price works out to. */
function PctField({ count, price, single, onPrice }: {
    count: number; price: number; single: number; onPrice: (p: number) => void;
}) {
    const full = count * single;
    const derived = full > 0 ? Math.round((1 - price / full) * 100) : '';
    const [typed, setTyped] = useState<number | '' | null>(null);
    return (
        <div className="flex items-center gap-1" onBlur={() => setTyped(null)}>
            <NumberField
                value={typed ?? derived}
                disabled={!(full > 0)}
                placeholder="—"
                onChange={(v) => {
                    setTyped(v);
                    if (v !== '' && full > 0) onPrice(round2(full * (1 - Math.min(v, 100) / 100)));
                }}
                aria-label="Percent off singles"
                className={`w-12 text-right ${PRICE_INPUT} disabled:text-white/20`}
            />
            <span className={PRICE_LABEL}>% off</span>
        </div>
    );
}

export function BundleRows({ bundles, single, onChange, onRemove, onAdd, tour }: {
    bundles: { photo_count: number; price: number; i: number }[];
    /** The per-photo price — each bundle shows its per-photo price and % off against it. */
    single: number;
    onChange: (i: number, patch: { photo_count?: number; price?: number }) => void;
    onRemove: (i: number) => void;
    onAdd: () => void;
    tour?: string;
}) {
    return (
        <div className="space-y-2" data-tour={tour}>
            {bundles.map(b => (
                <div key={b.i}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <NumberField
                                integer
                                value={b.photo_count}
                                onChange={(v) => onChange(b.i, { photo_count: v === '' ? 0 : v })}
                                aria-label="Photos in bundle"
                                className={`w-12 ${PRICE_INPUT} text-center`}
                            />
                            <span className={PRICE_LABEL}>photos</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <PctField count={b.photo_count} price={b.price} single={single} onPrice={(p) => onChange(b.i, { price: p })} />
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-white/40">$</span>
                                <NumberField
                                    value={b.price}
                                    onChange={(v) => onChange(b.i, { price: v === '' ? 0 : v })}
                                    aria-label="Bundle price"
                                    className={`w-24 text-right ${PRICE_INPUT}`}
                                />
                                <button type="button" onClick={() => onRemove(b.i)} className="w-6 text-white/40 hover:text-red-400 text-sm" aria-label="Remove bundle">×</button>
                            </div>
                        </div>
                    </div>
                    <MathLine count={b.photo_count} price={b.price} single={single} />
                </div>
            ))}
            <button type="button" onClick={onAdd} className="text-[10px] uppercase font-bold text-white/40 hover:text-white tracking-widest">
                + Add Bundle
            </button>
        </div>
    );
}
