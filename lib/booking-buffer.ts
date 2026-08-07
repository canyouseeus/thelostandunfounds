/**
 * Scheduling buffer — the single implementation of "how far apart two shoots
 * must be".
 *
 * Photography is subcontracted and the photographer has to physically get to
 * the next commitment. A shoot therefore reserves more than its own window: it
 * reserves BUFFER_MINUTES on each side for setup, teardown and travel.
 *
 * This lives in one place because it was previously in none. The server did not
 * check conflicts at all, BookingPage.tsx checked raw overlap client-side, and
 * ExpressBookingModal.tsx checked nothing — three different answers to one
 * question. Import from here; do not re-derive the arithmetic at a call site.
 */

/** Free time required before a booking starts and after it ends. */
export const BUFFER_MINUTES = 120

export interface TimeRange {
  start_time: string | null
  end_time: string | null
}

/** "18:30" | "18:30:00" -> 1110. Returns null for anything unparseable. */
export function toMinutes(time: string | null | undefined): number | null {
  if (!time) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(time)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

/**
 * Does [startA, endA] come within BUFFER_MINUTES of [startB, endB]?
 *
 * Touching counts as clear: a window ending exactly at the buffer boundary is
 * allowed, so a 2h gap passes and 1h59m does not.
 */
export function withinBuffer(
  startA: string | null,
  endA: string | null,
  startB: string | null,
  endB: string | null,
  bufferMinutes: number = BUFFER_MINUTES
): boolean {
  const aS = toMinutes(startA)
  const aE = toMinutes(endA)
  const bS = toMinutes(startB)
  const bE = toMinutes(endB)
  // An open-ended range cannot be reasoned about — treat it as no conflict
  // rather than silently blocking the whole day.
  if (aS === null || aE === null || bS === null || bE === null) return false
  return aS < bE + bufferMinutes && bS - bufferMinutes < aE
}

/**
 * Is a candidate window in conflict with any booking already on the day?
 *
 * `taken` should already be filtered to bookings that hold the date — i.e.
 * status in ('pending', 'confirmed'). Cancelled bookings do not reserve time.
 */
export function conflictsWithBuffer(
  start: string | null,
  end: string | null,
  taken: TimeRange[],
  bufferMinutes: number = BUFFER_MINUTES
): boolean {
  return taken.some((t) => withinBuffer(start, end, t.start_time, t.end_time, bufferMinutes))
}

/** The conflicting booking itself, for error messages. Null when clear. */
export function findBufferConflict(
  start: string | null,
  end: string | null,
  taken: TimeRange[],
  bufferMinutes: number = BUFFER_MINUTES
): TimeRange | null {
  return taken.find((t) => withinBuffer(start, end, t.start_time, t.end_time, bufferMinutes)) || null
}
