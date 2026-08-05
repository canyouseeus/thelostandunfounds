import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { ClockWidget } from '../components/ui/clock-widget'
import { WeatherWidget } from '../components/ui/weather-widget'
import { CalendarWidget } from '../components/ui/calendar-widget'
import { CalculatorCard } from '../components/admin/CalculatorCard'
import { FitBox } from '../components/ui/fit-box'
import { RevenueWidget } from '../components/ui/revenue-widget'
import { RegistryWidget } from '../components/ui/registry-widget'
import { AnalyticsWidget } from '../components/ui/analytics-widget'
import { CrmWidget } from '../components/ui/crm-widget'
import { NotificationsWidget } from '../components/ui/notifications-widget'
import { StatusMarks } from '../components/ui/viz'
import { DEFAULT_LAYOUT, DEFAULT_ORDER, SHAPE_CLASS } from '../components/admin/useDashboardLayout'

/* Figures pinned to what production actually reports today, so this is the
   real dashboard, not a mockup. */
const REVENUE = {
  total: 717.5,
  sources: [
    { label: 'Affiliate', value: 0 }, { label: 'Gallery', value: 55 },
    { label: 'Bookings', value: 795 }, { label: 'Shop', value: 130 },
    { label: 'Tickets', value: 0 },
  ],
  series: [0,0,0,0,0,0,45,0,0,120,0,0,0,0,0,0,270,0,0,0,0,55,0,0,0,0,0,0,130,95],
  refunds: 45,
}
const REGISTRY = { photos: 13275, users: 17, posts: 9, products: 24, writers: 12, affiliates: 3, subscribers: 123 }
const ANALYTICS = {
  views: 9795, visitors: 2140, bounceRate: 42,
  trend: [12,8,15,6,22,31,9,7,40,22,18,52,26,30,41,19,61,34,28,70,45,38,52,61,59,72,48,80,66,91],
  topPages: [
    { label: '/', count: 3458 }, { label: '/admin', count: 842 },
    { label: '/gallery', count: 779 }, { label: '/thelostarchives', count: 630 },
    { label: '/shop', count: 473 }, { label: '/gallery/last-night-noir', count: 406 },
  ],
  devices: [{ label: 'Mobile', count: 4404 }, { label: 'Desktop', count: 5376 }, { label: 'Tablet', count: 5 }],
  sources: [{ label: 'Direct', count: 1824 }, { label: 'Instagram', count: 219 }, { label: 'Facebook', count: 133 }, { label: 'Search', count: 13 }],
  geography: [{ label: 'United States', count: 1950 }, { label: 'Sweden', count: 29 }, { label: 'Germany', count: 25 }],
}
const CRM = {
  totals: { clients: 9, billed: 18420, collected: 14210, outstanding: 4210 },
  clients: [
    { id:'1', name:'Silva Star', email:null, phone:null, business:'Silva Star Events', notes:null, created_at:'2026-02-11', invoiceCount:6, billed:7200, collected:6400, outstanding:800, lastInvoiceDate:'2026-07-28' },
    { id:'2', name:'Kattitude', email:null, phone:null, business:null, notes:null, created_at:'2026-03-02', invoiceCount:4, billed:4800, collected:3600, outstanding:1200, lastInvoiceDate:'2026-07-14' },
    { id:'3', name:'M. Reyes', email:null, phone:null, business:null, notes:null, created_at:'2026-04-19', invoiceCount:3, billed:2900, collected:2100, outstanding:800, lastInvoiceDate:'2026-06-30' },
    { id:'4', name:'Lakeway HOA', email:null, phone:null, business:null, notes:null, created_at:'2026-01-27', invoiceCount:2, billed:1800, collected:1400, outstanding:400, lastInvoiceDate:'2026-05-22' },
    { id:'5', name:'D. Okafor', email:null, phone:null, business:null, notes:null, created_at:'2026-05-30', invoiceCount:1, billed:950, collected:710, outstanding:240, lastInvoiceDate:'2026-06-02' },
    { id:'6', name:'Bluebonnet Cafe', email:null, phone:null, business:null, notes:null, created_at:'2026-06-14', invoiceCount:1, billed:770, collected:0, outstanding:770, lastInvoiceDate:'2026-07-30' },
  ],
}
const NOTIFS = {
  pendingReviews: 2,
  services: [
    { label: 'Database', ok: true }, { label: 'API Engine', ok: true },
    { label: 'Auth', ok: true }, { label: 'Storage', ok: true },
  ],
  items: [
    { id:'1', type:'deployment', title:'Deployment Succeeded', message:'Layout: clamp saved shapes', severity:'info', read:false, created_at:'2026-08-05T14:22:00Z', deployment:null },
    { id:'2', type:'system', title:'Gallery Sync Complete', message:'214 photos synced', severity:'success', read:false, created_at:'2026-08-05T09:15:00Z', deployment:null },
    { id:'3', type:'stripe', title:'Refund Issued', message:'$45.00 — gallery order', severity:'warning', read:true, created_at:'2026-08-04T19:03:00Z', deployment:null },
    { id:'4', type:'deployment', title:'Deployment Succeeded', message:'Notifications: the real feed', severity:'info', read:true, created_at:'2026-08-04T11:40:00Z', deployment:null },
    { id:'5', type:'system', title:'Newsletter Sent', message:'Delivered to 123 subscribers', severity:'success', read:true, created_at:'2026-08-02T09:30:00Z', deployment:null },
    { id:'6', type:'deployment', title:'Deployment Succeeded', message:'CRM: collection dial', severity:'info', read:true, created_at:'2026-08-03T16:02:00Z', deployment:null },
    { id:'7', type:'system', title:'Booking Confirmed', message:'Silva Star — Aug 12', severity:'success', read:true, created_at:'2026-08-01T14:00:00Z', deployment:null },
  ],
}

function Widget({ id, size, phone }: { id: string; size: string; phone: boolean }) {
  const c = 'w-full h-full'
  if (id === 'clock') return <ClockWidget size="lg" className={`!min-h-0 ${c}`} />
  if (id === 'weather') return <WeatherWidget size={size} className={c} />
  if (id === 'calendar') return <FitBox base={500} className="h-full"><CalendarWidget size="fill" className={c} /></FitBox>
  if (id === 'calculator')
    return phone && size === '2x2'
      ? <CalculatorCard wide compact faceSize="lg" className={c} />
      : <FitBox base={440} className="h-full"><CalculatorCard wide className={c} /></FitBox>
  if (id === 'revenue-performance') return <RevenueWidget size={size} data={REVENUE} className={c} />
  if (id === 'registry') return <RegistryWidget size={size} data={REGISTRY} census={[]} onOpenPanel={() => {}} className={c} />
  if (id === 'site-analytics') return <AnalyticsWidget size={size} data={ANALYTICS} className={c} />
  if (id === 'crm') return <CrmWidget size={size} data={CRM} className={c} />
  if (id === 'notifications') return <NotificationsWidget size={size} data={NOTIFS} className={c} />
  // Network status keeps its legacy face for now.
  return (
    <div className="w-full h-full bg-black flex flex-col justify-between p-4 text-left" style={{ containerType: 'size' }}>
      <span className="font-black uppercase tracking-widest text-white/40" style={{ fontSize: '5cqmin', lineHeight: 1 }}>Services</span>
      <StatusMarks className="text-white" items={[
        { label: 'Database', ok: true }, { label: 'API Engine', ok: true },
        { label: 'Auth', ok: true }, { label: 'Storage', ok: true },
      ]} />
      <span className="font-black leading-none text-white tabular-nums" style={{ fontSize: '18cqmin' }}>4/4</span>
    </div>
  )
}

function Board({ phone, pageWidth, cap }: { phone: boolean; pageWidth?: number; cap?: number }) {
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
    <div data-board={phone ? 'phone' : 'desktop'} style={{ width: pageWidth ?? ((phone ? 358 : 1128) + 24), padding: 12 }} className="bg-black">
      <div ref={ref} className={`grid ${phone ? 'grid-cols-4 gap-3' : 'grid-cols-8 gap-6'} [grid-auto-flow:dense]`}
           style={unit ? { gridAutoRows: `${unit}px`, maxWidth: cap } : undefined}>
        {DEFAULT_ORDER.map(id => (
          <div key={id} className={SHAPE_CLASS[DEFAULT_LAYOUT[id]]} data-tile={id}>
            <Widget id={id} size={DEFAULT_LAYOUT[id]} phone={phone} />
          </div>
        ))}
      </div>
    </div>
  )
}

const q = new URLSearchParams(location.search)
const which = q.get('b')
const pageWidth = q.get('w') ? Number(q.get('w')) : undefined
const cap = q.get('cap') ? Number(q.get('cap')) : undefined
createRoot(document.getElementById('root')!).render(
  <div className="bg-black p-4 flex flex-col gap-8">
    {which !== 'desktop' && <Board phone />}
    {which !== 'phone' && <Board phone={false} pageWidth={pageWidth} cap={cap} />}
  </div>
)
