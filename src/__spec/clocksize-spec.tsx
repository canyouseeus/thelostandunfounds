import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { ClockWidget } from '../components/ui/clock-widget'
import { CalendarWidget } from '../components/ui/calendar-widget'
import { FitBox } from '../components/ui/fit-box'
import { SHAPE_CLASS } from '../components/admin/useDashboardLayout'

/** Clock and calendar at the same 4x4, exactly as Admin mounts them. */
function Board() {
  const ref = useRef<HTMLDivElement>(null)
  const [unit, setUnit] = useState(0)
  useEffect(() => {
    const el = ref.current!
    const m = () => { const w = el.getBoundingClientRect().width; if (w > 0) setUnit((w - 7 * 24) / 8) }
    m(); const ro = new ResizeObserver(m); ro.observe(el); return () => ro.disconnect()
  }, [])
  return (
    <div style={{ width: 1536, padding: 12 }} className="bg-black">
      <div ref={ref} className="grid grid-cols-8 gap-6 [grid-auto-flow:dense]"
           style={unit ? { gridAutoRows: `${unit}px` } : undefined}>
        <div className={SHAPE_CLASS['4x4']} data-tile="clock" style={{ outline: '1px dashed rgba(255,255,255,.3)' }}>
          <div className="w-full h-full touch-manipulation select-none">
            <ClockWidget size="lg" className="!min-h-0 w-full h-full" />
          </div>
        </div>
        <div className={SHAPE_CLASS['4x4']} data-tile="calendar" style={{ outline: '1px dashed rgba(255,255,255,.3)' }}>
          <FitBox base={500} className="h-full">
            <CalendarWidget size="fill" className="w-full h-full" />
          </FitBox>
        </div>
      </div>
    </div>
  )
}
createRoot(document.getElementById('root')!).render(<div className="bg-black p-4"><Board /></div>)
