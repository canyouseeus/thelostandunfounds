import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { WeatherWidget } from '../components/ui/weather-widget'
import { WeatherFx } from '../components/ui/weather-fx'
import type { ConditionKind } from '../lib/weather'
import { SHAPE_CLASS } from '../components/admin/useDashboardLayout'

/**
 * The house format for a widget spec sheet: the widget in a real lattice, every
 * cell framed with a dashed rule, the subject's frame brighter. Phone is four
 * columns at an 80px unit, desktop eight at 120px.
 */
function Lattice({ id, size, phone, neighbours, children }: {
  id: string
  size: keyof typeof SHAPE_CLASS
  phone: boolean
  neighbours: (keyof typeof SHAPE_CLASS)[]
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [unit, setUnit] = useState(0)
  const cols = phone ? 4 : 8
  const gap = phone ? 12 : 24
  useEffect(() => {
    const el = ref.current!
    const measure = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setUnit((w - (cols - 1) * gap) / cols)
    }
    measure()
    const ro = new ResizeObserver(measure); ro.observe(el)
    return () => ro.disconnect()
  }, [cols, gap])
  return (
    <div data-cell={id} style={{ width: (phone ? 358 : 1128) + 24, padding: 12 }} className="bg-black">
      <div ref={ref} className={`grid ${phone ? 'grid-cols-4 gap-3' : 'grid-cols-8 gap-6'} [grid-auto-flow:dense]`}
           style={unit ? { gridAutoRows: `${unit}px` } : undefined}>
        <div className={`${SHAPE_CLASS[size]} relative`} data-subject={id}>
          {children}
          <span className="absolute inset-0 pointer-events-none"
                style={{ outline: '2px dashed rgba(255,255,255,.75)', outlineOffset: '-2px' }} />
        </div>
        {neighbours.map((s, i) => (
          <div key={i} className={`${SHAPE_CLASS[s]} flex items-center justify-center`}
               style={{ outline: '1px dashed rgba(255,255,255,.28)', outlineOffset: '-1px' }}>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">{s}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Neighbours chosen so every lattice closes on a complete row; no ragged bottom. */
const PHONE_FILL: Record<string, (keyof typeof SHAPE_CLASS)[]> = {
  '1x1': ['1x1', '1x1', '1x1', '4x1', '2x2', '2x2'],
  '2x1': ['2x1', '4x1', '2x2', '2x2'],
  '4x1': ['1x1', '1x1', '1x1', '1x1', '2x2', '2x2'],
  '1x2': ['1x2', '1x2', '1x2', '4x1'],
  '2x2': ['2x2', '4x1', '1x1', '1x1', '1x1', '1x1'],
  '1x4': ['1x4', '1x4', '1x4'],
  '4x2': ['2x2', '2x2', '4x1'],
  '2x4': ['2x4', '4x1'],
  '4x4': ['2x2', '2x2', '4x1'],
}

const DESK_FILL: Record<string, (keyof typeof SHAPE_CLASS)[]> = {
  '1x1': ['1x1', '1x1', '1x1', '1x1', '1x1', '1x1', '1x1', '4x1', '4x1'],
  '2x1': ['2x1', '2x1', '2x1', '4x2', '4x2'],
  '4x1': ['4x1', '2x2', '2x2', '4x2'],
  '1x2': ['1x2', '1x2', '1x2', '1x2', '1x2', '1x2', '1x2'],
  '2x2': ['2x2', '2x2', '2x2', '4x2', '4x2'],
  '1x4': ['1x4', '1x4', '1x4', '1x4', '1x4', '1x4', '1x4'],
  '4x2': ['4x2', '2x2', '2x2', '2x2', '2x2'],
  '2x4': ['2x4', '2x4', '2x4'],
  '4x4': ['2x4', '2x4', '4x2', '4x2'],
}

const SIZES = ['1x1', '2x1', '4x1', '1x2', '2x2', '1x4', '4x2', '2x4', '4x4'] as const

/** The condition layer on its own, so the sheet can show weather the city isn't having. */
const KINDS: ConditionKind[] = ['clear', 'cloud', 'fog', 'rain', 'snow', 'storm']

function FxSwatch({ kind }: { kind: ConditionKind }) {
  return (
    <div data-fx={kind} className="relative bg-black overflow-hidden" style={{ width: 173, height: 173 }}>
      <WeatherFx kind={kind} />
      <span className="absolute inset-0 pointer-events-none"
            style={{ outline: '2px dashed rgba(255,255,255,.75)', outlineOffset: '-2px' }} />
      <span className="absolute bottom-2 left-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
        {kind}
      </span>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <div className="bg-black p-4 flex flex-col gap-6">
    {SIZES.map(size => (
      <Lattice key={`p-${size}`} id={`phone-${size}`} size={size} phone neighbours={PHONE_FILL[size]}>
        <WeatherWidget size={size} className="w-full h-full" />
      </Lattice>
    ))}
    {SIZES.map(size => (
      <Lattice key={`d-${size}`} id={`desk-${size}`} size={size} phone={false} neighbours={DESK_FILL[size]}>
        <WeatherWidget size={size} className="w-full h-full" />
      </Lattice>
    ))}
    <div data-cell="fx" className="bg-black p-3 flex flex-wrap gap-3" style={{ width: 382 }}>
      {KINDS.map(k => <FxSwatch key={k} kind={k} />)}
    </div>
  </div>
)
