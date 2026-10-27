import { useEffect, useRef } from 'react'

/**
 * Pan + pinch on a canvas. Reports drags in fractions of the canvas box and
 * pinch/wheel zoom as a factor about the fingers' midpoint, so callers never
 * touch pixels. Two pointers = pinch; one = drag.
 */
export function useCanvasGestures(
  ref: React.RefObject<HTMLCanvasElement>,
  active: boolean,
  h: {
    onDrag: (dx: number, dy: number) => void // fractions of canvas width / height
    onZoom: (factor: number, fx: number, fy: number) => void // fx, fy: fractions of width from the centre
  },
) {
  const handlers = useRef(h)
  handlers.current = h

  useEffect(() => {
    const el = ref.current
    if (!active || !el) return
    const pts = new Map<number, { x: number; y: number }>()
    let lastDist = 0

    const mid = () => {
      const p = Array.from(pts.values())
      return { x: p.reduce((s, q) => s + q.x, 0) / p.length, y: p.reduce((s, q) => s + q.y, 0) / p.length }
    }
    const dist = () => {
      const [a, b] = Array.from(pts.values())
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const focal = (x: number, y: number) => {
      const r = el.getBoundingClientRect()
      return { fx: (x - r.left) / r.width - 0.5, fy: (y - r.top) / r.width - r.height / r.width / 2 }
    }

    const down = (e: PointerEvent) => {
      try { el.setPointerCapture(e.pointerId) } catch { /* pointer already gone */ }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pts.size === 2) lastDist = dist()
    }
    const move = (e: PointerEvent) => {
      const prev = pts.get(e.pointerId)
      if (!prev) return
      const r = el.getBoundingClientRect()
      if (pts.size === 1) {
        handlers.current.onDrag((e.clientX - prev.x) / r.width, (e.clientY - prev.y) / r.height)
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      } else if (pts.size === 2) {
        const before = mid()
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const after = mid()
        const d = dist()
        if (lastDist > 0 && d > 0) {
          const f = focal(after.x, after.y)
          handlers.current.onZoom(d / lastDist, f.fx, f.fy)
        }
        lastDist = d
        // Two fingers also carry the content along as they travel.
        handlers.current.onDrag((after.x - before.x) / r.width, (after.y - before.y) / r.height)
      }
    }
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId)
      lastDist = pts.size === 2 ? dist() : 0
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const f = focal(e.clientX, e.clientY)
      handlers.current.onZoom(Math.exp(-e.deltaY * 0.0015), f.fx, f.fy)
    }

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [ref, active])
}
