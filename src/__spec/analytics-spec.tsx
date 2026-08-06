import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { AnalyticsWidget, AnalyticsWidgetData } from '../components/ui/analytics-widget'
import { SHAPE_CLASS } from '../components/admin/useDashboardLayout'

/** Pinned census so composition is judged deterministically. */
const DATA: AnalyticsWidgetData = {
  views: 48213,
  visitors: 9120,
  bounceRate: 42,
  trend: [820, 640, 910, 700, 1180, 1490, 980, 760, 1620, 1210, 1040, 1980, 1330, 1490,
          1740, 1080, 2210, 1560, 1380, 2480, 1890, 1660, 2060, 2310, 2240, 2570, 1990, 2820, 2440, 3010],
  topPages: [
    { label: '/thelostarchives', count: 18240 },
    { label: '/gallery', count: 12480 },
    { label: '/', count: 8110 },
    { label: '/shop', count: 4820 },
    { label: '/booking', count: 2890 },
    { label: '/about', count: 1673 },
  ],
  devices: [
    { label: 'Mobile', count: 29410 },
    { label: 'Desktop', count: 16220 },
    { label: 'Tablet', count: 2583 },
  ],
  sources: [
    { label: 'Direct', count: 21050 },
    { label: 'Instagram', count: 14300 },
    { label: 'Search', count: 9180 },
    { label: 'Newsletter', count: 3683 },
  ],
  geography: [
    { label: 'United States', count: 38120 },
    { label: 'Canada', count: 4210 },
    { label: 'United Kingdom', count: 2960 },
    { label: 'Other', count: 2923 },
  ],
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
          <AnalyticsWidget size={size} data={DATA} className="w-full h-full" />
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

const SIZES = ['2x2', '4x2', '2x4'] as const

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
