import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { EditableTile, TileEditorSheet } from '../components/admin/EditableTile'
import { DEFAULT_LAYOUT, DEFAULT_ORDER, SHAPE_CLASS, ShapeName } from '../components/admin/useDashboardLayout'

/** Stand-in faces: the editor is the subject, not the widgets. */
const FACE: Record<string, { label: string; figure: string }> = {
  clock: { label: 'Clock', figure: '2:17' },
  weather: { label: 'Weather', figure: '101°' },
  'revenue-performance': { label: 'Revenue', figure: '$718' },
  calendar: { label: 'Calendar', figure: 'WED 5' },
  registry: { label: 'Registry', figure: '13.3K' },
  'site-analytics': { label: 'Views', figure: '2,140' },
  crm: { label: 'Clients', figure: '9' },
  notifications: { label: 'Unread', figure: '5' },
  'network-status': { label: 'Services', figure: '4/4' },
  calculator: { label: 'Calculator', figure: '+ ÷ = ×' },
}

function Face({ id }: { id: string }) {
  const f = FACE[id]
  return (
    <div className="w-full h-full bg-black flex flex-col justify-between p-3 text-left" style={{ containerType: 'size' }}>
      <span className="font-black uppercase tracking-widest text-white/40" style={{ fontSize: '8cqmin', lineHeight: 1 }}>{f.label}</span>
      <span className="font-black leading-none text-white tabular-nums" style={{ fontSize: '20cqmin' }}>{f.figure}</span>
    </div>
  )
}

function Grid({ editing, shapes }: { editing: boolean; shapes: Record<string, ShapeName> }) {
  const ref = useRef<HTMLDivElement>(null)
  const [unit, setUnit] = useState(0)
  useEffect(() => {
    const el = ref.current!
    const measure = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setUnit((w - 3 * 12) / 4)
    }
    measure()
    const ro = new ResizeObserver(measure); ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const gap = 12, period = unit + gap, line = 'rgba(255,255,255,0.08)'
  return (
    <div data-cell={editing ? 'editing' : 'normal'} style={{ width: 382, padding: 12 }} className="bg-black">
      <div
        ref={ref}
        className="grid grid-cols-4 gap-3 [grid-auto-flow:dense]"
        style={unit ? {
          gridAutoRows: `${unit}px`,
          ...(editing ? {
            backgroundImage:
              `repeating-linear-gradient(to right, transparent 0, transparent ${period - gap / 2 - 1}px, ${line} ${period - gap / 2 - 1}px, ${line} ${period - gap / 2}px, transparent ${period - gap / 2}px, transparent ${period}px),` +
              `repeating-linear-gradient(to bottom, transparent 0, transparent ${period - gap / 2 - 1}px, ${line} ${period - gap / 2 - 1}px, ${line} ${period - gap / 2}px, transparent ${period - gap / 2}px, transparent ${period}px)`,
          } : {}),
        } : undefined}
      >
        {DEFAULT_ORDER.map(id => (
          <EditableTile
            key={id}
            id={id}
            className={SHAPE_CLASS[shapes[id]]}
            editing={editing}
            shape={shapes[id]}
            onSetShape={() => {}}
            onDropBefore={() => {}}
            light={false}
            onToggleBackground={() => {}}
          >
            <Face id={id} />
          </EditableTile>
        ))}
      </div>
    </div>
  )
}

/* ?mode=sheet renders only the tile editor; it portals to body, so mounted
   alongside the grids it covers them and every capture is polluted. */
const mode = new URLSearchParams(location.search).get('mode')

createRoot(document.getElementById('root')!).render(
  mode === 'sheet' ? (
    <TileEditorSheet
      id="registry"
      title="registry"
      shape="4x2"
      light={false}
      onSetShape={() => {}}
      onToggleBackground={() => {}}
      onClose={() => {}}
    />
  ) : (
    <div className="bg-black p-4 flex flex-col gap-8">
      <Grid editing={false} shapes={DEFAULT_LAYOUT} />
      <Grid editing shapes={DEFAULT_LAYOUT} />
    </div>
  )
)
