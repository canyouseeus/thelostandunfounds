/**
 * Public Changelog
 *
 * Every day of work on the platform since the first commit, read straight out
 * of the repository history and sanitised at build time by
 * scripts/generate-changelog.mjs. Nothing here is hand-written: to change what
 * appears, change the generator.
 */

import { useMemo, useState } from 'react'
import SEOHead from '../components/SEOHead'
import changelog from '../data/changelog.json'

type Entry = { area: string; text: string }
type Day = { date: string; entries: Entry[] }

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
]

/** Parse "2026-08-06" without letting the local timezone shift the day. */
function parts(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return { year: y, month: m - 1, day: d }
}

function monthKey(date: string) {
  const { year, month } = parts(date)
  return `${MONTHS[month]} ${year}`
}

function dayLabel(date: string) {
  const { year, month, day } = parts(date)
  const weekday = new Date(Date.UTC(year, month, day)).toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  })
  return `${weekday.toUpperCase()} ${String(day).padStart(2, '0')} ${MONTHS[month].slice(0, 3)}`
}

export default function Changelog() {
  const days = changelog.days as Day[]
  const [area, setArea] = useState<string>('ALL')

  const areas = useMemo(() => {
    const counts = new Map<string, number>()
    for (const day of days) {
      for (const entry of day.entries) {
        counts.set(entry.area, (counts.get(entry.area) ?? 0) + 1)
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
  }, [days])

  const filtered = useMemo(() => {
    if (area === 'ALL') return days
    return days
      .map((day) => ({ ...day, entries: day.entries.filter((e) => e.area === area) }))
      .filter((day) => day.entries.length > 0)
  }, [days, area])

  const shown = useMemo(
    () => filtered.reduce((n, day) => n + day.entries.length, 0),
    [filtered],
  )

  // Group the visible days under a month heading, preserving order.
  const months = useMemo(() => {
    const out: { label: string; days: Day[] }[] = []
    for (const day of filtered) {
      const label = monthKey(day.date)
      if (out.length === 0 || out[out.length - 1].label !== label) {
        out.push({ label, days: [day] })
      } else {
        out[out.length - 1].days.push(day)
      }
    }
    return out
  }, [filtered])

  const since = (() => {
    const { year, month } = parts(changelog.firstDate)
    return `${MONTHS[month].slice(0, 3)} ${year}`
  })()

  return (
    <>
      <SEOHead
        title="CHANGELOG"
        description="Every update shipped to THE LOST+UNFOUNDS, day by day, from the first commit to today. Gallery, bookings, billing, blog, shop and platform work in the open."
        canonicalPath="/changelog"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-3">CHANGELOG</h1>
        <p className="text-white/70 max-w-2xl">
          Everything shipped to <strong className="font-bold text-white">THE LOST+UNFOUNDS</strong>,
          day by day, straight from the build history. Client names and personal details are left
          out; the work is not.
        </p>

        {/* Stat row — surfaces, not outlines */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px mt-8">
          {[
            { label: 'UPDATES SHIPPED', value: String(changelog.totalEntries) },
            { label: 'DAYS SHIPPED ON', value: String(changelog.totalDays) },
            { label: 'BUILDING SINCE', value: since },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/5 px-5 py-6" style={{ borderRadius: 0 }}>
              <div className="text-3xl font-black text-white">{stat.value}</div>
              <div className="text-[11px] tracking-widest text-white/50 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Area filter */}
        <div className="flex flex-wrap gap-2 mt-8">
          {['ALL', ...areas].map((name) => {
            const active = area === name
            return (
              <button
                key={name}
                type="button"
                onClick={() => setArea(name)}
                style={{ borderRadius: 0 }}
                className={`px-3 py-2 text-[11px] tracking-widest transition-colors ${
                  active ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {name.toUpperCase()}
              </button>
            )
          })}
        </div>

        <p className="text-white/40 text-xs mt-4">
          Showing {shown} {shown === 1 ? 'update' : 'updates'}
          {area === 'ALL' ? '' : ` in ${area.toLowerCase()}`}.
        </p>

        {/* The log */}
        <div className="mt-12 space-y-14">
          {months.map((month) => (
            <section key={month.label}>
              <h2 className="text-sm font-black tracking-[0.2em] text-white/50 mb-6">
                {month.label}
              </h2>

              <div className="space-y-8">
                {month.days.map((day) => (
                  <div key={day.date} className="sm:flex sm:gap-8">
                    <div className="sm:w-40 sm:shrink-0 mb-2 sm:mb-0">
                      <div className="text-xs tracking-widest text-white/60 sm:sticky sm:top-24">
                        {dayLabel(day.date)}
                      </div>
                    </div>
                    <ul className="flex-1 space-y-px">
                      {day.entries.map((entry, i) => (
                        <li
                          key={`${day.date}-${i}`}
                          className="bg-white/5 hover:bg-white/10 transition-colors px-4 py-3 flex flex-col sm:flex-row sm:items-baseline sm:gap-4"
                          style={{ borderRadius: 0 }}
                        >
                          <span className="text-[10px] tracking-widest text-white/40 sm:w-24 sm:shrink-0 mb-1 sm:mb-0">
                            {entry.area.toUpperCase()}
                          </span>
                          <span className="text-white/85 text-sm text-left">{entry.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="text-white/40 text-xs mt-16">
          Generated from the repository history. Reverts, deploy triggers and internal tooling
          commits are left out, and anything naming a client or an individual is folded into a
          generic line.
        </p>
      </div>
    </>
  )
}
