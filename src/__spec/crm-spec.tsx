import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { CrmWidget, CrmWidgetData } from '../components/ui/crm-widget'
import { SHAPE_CLASS } from '../components/admin/useDashboardLayout'

/** Pinned census so composition is judged deterministically. */
const DATA: CrmWidgetData = {
  totals: { clients: 9, billed: 18420, collected: 14210, outstanding: 4210 },
  clients: [
    { id: '1', name: 'Silva Star', email: 'ops@silvastar.com', phone: '512-555-0181', business: 'Silva Star Events', notes: 'Prefers evening shoots. Net-15.', created_at: '2026-02-11T00:00:00Z', invoiceCount: 6, billed: 7200, collected: 6400, outstanding: 800, lastInvoiceDate: '2026-07-28T00:00:00Z' },
    { id: '2', name: 'Kattitude', email: 'hello@kattitude.co', phone: null, business: 'Kattitude Studio', notes: null, created_at: '2026-03-02T00:00:00Z', invoiceCount: 4, billed: 4800, collected: 3600, outstanding: 1200, lastInvoiceDate: '2026-07-14T00:00:00Z' },
    { id: '3', name: 'M. Reyes', email: 'mreyes@gmail.com', phone: '512-555-0102', business: null, notes: null, created_at: '2026-04-19T00:00:00Z', invoiceCount: 3, billed: 2900, collected: 2100, outstanding: 800, lastInvoiceDate: '2026-06-30T00:00:00Z' },
    { id: '4', name: 'Lakeway HOA', email: 'events@lakeway.org', phone: null, business: 'Lakeway HOA', notes: 'Annual contract.', created_at: '2026-01-27T00:00:00Z', invoiceCount: 2, billed: 1800, collected: 1400, outstanding: 400, lastInvoiceDate: '2026-05-22T00:00:00Z' },
    { id: '5', name: 'D. Okafor', email: null, phone: '737-555-0166', business: null, notes: null, created_at: '2026-05-30T00:00:00Z', invoiceCount: 1, billed: 950, collected: 710, outstanding: 240, lastInvoiceDate: '2026-06-02T00:00:00Z' },
    { id: '6', name: 'Bluebonnet Cafe', email: 'gm@bluebonnet.cafe', phone: null, business: 'Bluebonnet Cafe', notes: null, created_at: '2026-06-14T00:00:00Z', invoiceCount: 1, billed: 770, collected: 0, outstanding: 770, lastInvoiceDate: '2026-07-30T00:00:00Z' },
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
          <CrmWidget size={size} data={DATA} className="w-full h-full" />
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

const SIZES = ['2x2', '4x2', '2x4', '4x4'] as const

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
