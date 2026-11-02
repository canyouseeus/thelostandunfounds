/**
 * Gallery pricing rows (owner, 2026-11-02): every price in one PRICING section,
 * one layout — label left, $ box right, never wrapping on a phone.
 */
// --- Pricing rows (one layout for every price; label left, box right) --------
export const PRICE_GROUP = 'text-[10px] font-black uppercase tracking-[0.2em] text-white/70';
const PRICE_LABEL = 'text-[10px] font-black uppercase tracking-[0.2em] text-white/40 whitespace-nowrap';
const PRICE_INPUT = 'bg-white/5 rounded-none px-2 py-1.5 text-sm text-white font-bold font-mono focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

export function PriceRow({ label, value, onChange, placeholder, min = 1, tour }: {
    label: string;
    value: number | '';
    onChange: (v: number | '') => void;
    placeholder?: string;
    min?: number;
    tour?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3" data-tour={tour}>
            <span className={PRICE_LABEL}>{label}</span>
            <div className="flex items-center gap-1">
                <span className="text-xs text-white/40">$</span>
                <input
                    type="number"
                    min={min}
                    step="0.01"
                    inputMode="decimal"
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value) || 0)}
                    aria-label={label}
                    className={`w-24 text-right ${PRICE_INPUT}`}
                />
                {/* Same width as a bundle row's ×, so every box lines up. */}
                <span className="w-6" aria-hidden />
            </div>
        </div>
    );
}

export function BundleRows({ bundles, onChange, onRemove, onAdd, tour }: {
    bundles: { photo_count: number; price: number; i: number }[];
    onChange: (i: number, patch: { photo_count?: number; price?: number }) => void;
    onRemove: (i: number) => void;
    onAdd: () => void;
    tour?: string;
}) {
    return (
        <div className="space-y-2" data-tour={tour}>
            {bundles.map(b => (
                <div key={b.i} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min="2"
                            inputMode="numeric"
                            value={b.photo_count}
                            onChange={(e) => onChange(b.i, { photo_count: Math.floor(Number(e.target.value) || 0) })}
                            aria-label="Photos in bundle"
                            className={`w-12 ${PRICE_INPUT} text-center`}
                        />
                        <span className={PRICE_LABEL}>photos</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-white/40">$</span>
                        <input
                            type="number"
                            min="1"
                            step="0.01"
                            inputMode="decimal"
                            value={b.price}
                            onChange={(e) => onChange(b.i, { price: Number(e.target.value) || 0 })}
                            aria-label="Bundle price"
                            className={`w-24 text-right ${PRICE_INPUT}`}
                        />
                        <button type="button" onClick={() => onRemove(b.i)} className="w-6 text-white/40 hover:text-red-400 text-sm" aria-label="Remove bundle">×</button>
                    </div>
                </div>
            ))}
            <button type="button" onClick={onAdd} className="text-[10px] uppercase font-bold text-white/40 hover:text-white tracking-widest">
                + Add Bundle
            </button>
        </div>
    );
}

