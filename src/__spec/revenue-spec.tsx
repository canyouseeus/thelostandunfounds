import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { RevenueWidget, RevenueWidgetData } from '../components/ui/revenue-widget'
import { SHAPE_CLASS } from '../components/admin/useDashboardLayout'

/** Pinned figures so every render is judged on composition, not luck. */
const DATA: RevenueWidgetData = {
  total: 12437,
  sources: [
    { label: 'Affiliate', value: 3120 },
    { label: 'Gallery', value: 4890 },
    { label: 'Bookings', value: 2650 },
    { label: 'Shop', value: 1402 },
    { label: 'Tickets', value: 375 },
  ],
  // Four weeks with a visible arc: slow start, mid spike, strong close.
  series: [120, 95, 180, 60, 240, 310, 150, 90, 400, 220, 180, 520, 260, 300,
           410, 190, 610, 340, 280, 700, 450, 380, 520, 610, 590, 720, 480, 800, 660, 910],
  refunds: 214,
}

function Lattice({ id, size, phone, neighbours }: {
  id: string
  size: keyof typeof SHAPE_CLASS
  phone: boolean
  neighbours: (keyof typeof SHAPE_CLASS)[]
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
          <RevenueWidget size={size} data={DATA} className="w-full h-full" />
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

createRoot(document.getElementById('root')!).render(
  <div className="bg-black p-4 flex flex-col gap-6">
    {SIZES.map(size => (
      <Lattice key={`p-${size}`} id={`phone-${size}`} size={size} phone neighbours={PHONE_FILL[size]} />
    ))}
    {SIZES.map(size => (
      <Lattice key={`d-${size}`} id={`desk-${size}`} size={size} phone={false} neighbours={DESK_FILL[size]} />
    ))}
  </div>
)
