import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { NotificationsWidget, NotificationsWidgetData } from '../components/ui/notifications-widget'
import { SHAPE_CLASS } from '../components/admin/useDashboardLayout'

/** Pinned census so composition is judged deterministically. */
const DATA: NotificationsWidgetData = {
  pendingReviews: 2,
  items: [
    { id: '1', type: 'deployment', title: 'Deployment Failed', message: 'Widget system: per-size views — type error in revenue-widget.tsx', severity: 'error', read: false, created_at: '2026-08-05T14:22:00Z',
      deployment: { id: 'dpl_9f2k', status: 'error', sha: 'a4f19c2', commit: 'Widget system: per-size views', url: null, errorExcerpt: 'src/components/ui/revenue-widget.tsx(41,3): error TS2322: Type string is not assignable to type number' } },
    { id: '2', type: 'deployment', title: 'Deployment Succeeded', message: 'Registry: the platform census — thelostandunfounds.com', severity: 'info', read: false, created_at: '2026-08-05T13:10:00Z',
      deployment: { id: 'dpl_8x1q', status: 'succeeded', sha: '5c1cc66', commit: 'Registry: the platform census', url: 'https://thelostandunfounds.com', errorExcerpt: null } },
    { id: '3', type: 'stripe', title: 'Refund Issued', message: 'charge_3Rf2 refunded $45.00 — gallery order', severity: 'warning', read: false, created_at: '2026-08-04T19:03:00Z', deployment: null },
    { id: '4', type: 'deployment', title: 'Deployment Succeeded', message: 'Analytics: fix the page-view black hole', severity: 'info', read: true, created_at: '2026-08-04T11:40:00Z', deployment: null },
    { id: '5', type: 'system', title: 'Gallery Sync Complete', message: '214 photos synced from Google Drive', severity: 'success', read: true, created_at: '2026-08-03T22:15:00Z', deployment: null },
    { id: '6', type: 'deployment', title: 'Deployment Succeeded', message: 'CRM: collection dial and roster', severity: 'info', read: true, created_at: '2026-08-03T16:02:00Z', deployment: null },
    { id: '7', type: 'system', title: 'Newsletter Sent', message: 'Campaign delivered to 123 subscribers', severity: 'success', read: true, created_at: '2026-08-02T09:30:00Z', deployment: null },
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
          <NotificationsWidget size={size} data={DATA} className="w-full h-full" />
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
