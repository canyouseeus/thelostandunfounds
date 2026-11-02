/**
 * A number box that shows exactly what was typed (owner, 2026-11-02:
 * "the zero never goes away … now it's like saying 010").
 *
 * A plain controlled <input type="number" value={n}> turns a cleared box back
 * into 0, so the next digit lands after it ("010") and the cursor has to be
 * moved to fix it. Here the box keeps its own text while it is being edited:
 *   - clearing it leaves it empty (onChange gets '' — the caller decides what
 *     empty means, e.g. "not offered" or 0),
 *   - leading zeros are dropped as you type ("010" → "10", "0.5" stays),
 *   - tapping it selects what's there, so typing replaces it.
 * It uses a text box with a decimal keypad, so the browser never rewrites it.
 */
import { useEffect, useRef, useState } from 'react';

export interface NumberFieldProps {
    value: number | '' | null | undefined;
    onChange: (value: number | '') => void;
    /** Whole numbers only (counts). */
    integer?: boolean;
    className?: string;
    placeholder?: string;
    'aria-label'?: string;
    disabled?: boolean;
}

const toText = (v: NumberFieldProps['value']) => (v === '' || v == null || Number.isNaN(v) ? '' : String(v));

/** What the box should show for raw typing: digits (and one dot), no leading zeros. */
export function cleanNumberText(raw: string, integer = false): string {
    let t = raw.replace(integer ? /[^\d]/g : /[^\d.]/g, '');
    if (!integer) {
        const dot = t.indexOf('.');
        if (dot !== -1) t = t.slice(0, dot + 1) + t.slice(dot + 1).replace(/\./g, '');
    }
    // "010" → "10", "00" → "0", but keep "0" and "0.5".
    t = t.replace(/^0+(?=\d)/, '');
    return t;
}

export default function NumberField({ value, onChange, integer = false, className, placeholder, disabled, ...rest }: NumberFieldProps) {
    const [text, setText] = useState(toText(value));
    const editing = useRef(false);

    // Follow outside changes (another field, a reload) unless it's being typed in.
    useEffect(() => {
        if (!editing.current) setText(toText(value));
    }, [value]);

    return (
        <input
            type="text"
            inputMode={integer ? 'numeric' : 'decimal'}
            autoComplete="off"
            value={text}
            placeholder={placeholder}
            disabled={disabled}
            aria-label={rest['aria-label']}
            className={className}
            onFocus={(e) => { editing.current = true; e.currentTarget.select(); }}
            onBlur={() => { editing.current = false; setText(toText(value)); }}
            onChange={(e) => {
                const t = cleanNumberText(e.target.value, integer);
                setText(t);
                if (t === '' || t === '.') onChange('');
                else onChange(Number(t));
            }}
        />
    );
}
