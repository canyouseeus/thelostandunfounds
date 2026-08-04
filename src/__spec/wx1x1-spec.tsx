import { createRoot } from 'react-dom/client'
import '../index.css'

/**
 * Six candidate 1x1 faces, side by side at both true cell sizes. Data is
 * pinned (Austin, 101°, clear) so every variation is judged on composition
 * alone. All type and glyph sizes are cqmin so the winner drops straight
 * into the widget unchanged.
 */
const GLYPH = '☀'
const TEMP = '101°'
const CITY = 'AUSTIN'

const cell: React.CSSProperties = {
  containerType: 'size',
  borderRadius: 0,
}

function Frame({ id, size, children }: { id: string; size: number; children: React.ReactNode }) {
  return (
    <div data-var={`${id}-${size}`} className="relative bg-black overflow-hidden" style={{ ...cell, width: size, height: size }}>
      {children}
      <span className="absolute inset-0 pointer-events-none"
            style={{ outline: '2px dashed rgba(255,255,255,.75)', outlineOffset: '-2px' }} />
    </div>
  )
}

/** A — Apple's order: city, temperature, glyph + label at the foot. */
const AppleOrder = () => (
  <div className="absolute flex flex-col text-left" style={{ inset: '9cqmin' }}>
    <span className="font-black uppercase tracking-widest text-white/60" style={{ fontSize: '10cqmin', lineHeight: 1 }}>{CITY}</span>
    <span className="font-black text-white tabular-nums" style={{ fontSize: '34cqmin', lineHeight: 1, marginTop: '4cqmin' }}>{TEMP}</span>
    <span className="mt-auto grayscale leading-none" style={{ fontSize: '22cqmin' }}>{GLYPH}</span>
  </div>
)

/** B — the glyph is the tile: oversized, centred, temperature over it. */
const GlyphField = () => (
  <>
    <span className="absolute grayscale leading-none opacity-30"
          style={{ fontSize: '95cqmin', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>{GLYPH}</span>
    <div className="absolute flex flex-col text-left" style={{ inset: '9cqmin' }}>
      <span className="font-black uppercase tracking-widest text-white/60" style={{ fontSize: '10cqmin', lineHeight: 1 }}>{CITY}</span>
      <span className="mt-auto font-black text-white tabular-nums" style={{ fontSize: '34cqmin', lineHeight: 1 }}>{TEMP}</span>
    </div>
  </>
)

/** C — corner bleed: the glyph oversized and cropped by the tile's edge. */
const CornerBleed = () => (
  <>
    <span className="absolute grayscale leading-none opacity-40"
          style={{ fontSize: '80cqmin', right: '-22cqmin', bottom: '-24cqmin' }}>{GLYPH}</span>
    <div className="absolute flex flex-col text-left" style={{ inset: '9cqmin' }}>
      <span className="font-black uppercase tracking-widest text-white/60" style={{ fontSize: '10cqmin', lineHeight: 1 }}>{CITY}</span>
      <span className="font-black text-white tabular-nums" style={{ fontSize: '32cqmin', lineHeight: 1, marginTop: '4cqmin' }}>{TEMP}</span>
    </div>
  </>
)

/** D — stacked even: big glyph top, temperature bottom, no city. */
const StackEven = () => (
  <div className="absolute flex flex-col items-start justify-between text-left" style={{ inset: '9cqmin' }}>
    <span className="grayscale leading-none" style={{ fontSize: '40cqmin' }}>{GLYPH}</span>
    <span className="font-black text-white tabular-nums" style={{ fontSize: '34cqmin', lineHeight: 1 }}>{TEMP}</span>
  </div>
)

/** E — centred totem: glyph over temperature over city, all centred. */
const Totem = () => (
  <div className="absolute flex flex-col items-center justify-center" style={{ inset: '7cqmin', gap: '5cqmin' }}>
    <span className="grayscale leading-none" style={{ fontSize: '36cqmin' }}>{GLYPH}</span>
    <span className="font-black text-white tabular-nums" style={{ fontSize: '28cqmin', lineHeight: 1 }}>{TEMP}</span>
    <span className="font-black uppercase tracking-widest text-white/40" style={{ fontSize: '8cqmin', lineHeight: 1 }}>{CITY}</span>
  </div>
)

/** F — diagonal: glyph big in the top-right, temperature anchored bottom-left. */
const Diagonal = () => (
  <>
    <span className="absolute grayscale leading-none"
          style={{ fontSize: '46cqmin', top: '6cqmin', right: '6cqmin' }}>{GLYPH}</span>
    <div className="absolute flex flex-col text-left" style={{ left: '9cqmin', bottom: '9cqmin' }}>
      <span className="font-black uppercase tracking-widest text-white/60" style={{ fontSize: '9cqmin', lineHeight: 1, marginBottom: '3cqmin' }}>{CITY}</span>
      <span className="font-black text-white tabular-nums" style={{ fontSize: '32cqmin', lineHeight: 1 }}>{TEMP}</span>
    </div>
  </>
)

const VARIANTS: [string, string, () => JSX.Element][] = [
  ['A', 'Apple order — city, temp, glyph at the foot', AppleOrder],
  ['B', 'Glyph field — oversized glyph behind everything', GlyphField],
  ['C', 'Corner bleed — glyph cropped by the tile edge', CornerBleed],
  ['D', 'Stack — glyph and temp split the height', StackEven],
  ['E', 'Totem — everything centred', Totem],
  ['F', 'Diagonal — glyph and temp in opposite corners', Diagonal],
]

createRoot(document.getElementById('root')!).render(
  <div className="bg-black p-4 flex flex-col gap-6">
    {VARIANTS.map(([id, label, Face]) => (
      <div key={id} data-row={id} className="flex items-end gap-4">
        <Frame id={id} size={81}><Face /></Frame>
        <Frame id={id} size={120}><Face /></Frame>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 pb-1">{id} — {label}</span>
      </div>
    ))}
  </div>
)
