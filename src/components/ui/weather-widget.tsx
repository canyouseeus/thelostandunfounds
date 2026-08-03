import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, MapPinIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { cn } from './utils';
import { useLongPress } from './use-long-press';
import {
  DEFAULT_PLACE,
  WeatherPlace,
  WeatherSnapshot,
  aqiCategory,
  compassPoint,
  conditionGlyph,
  conditionLabel,
  describeCoords,
  fetchWeather,
  loadSavedPlace,
  savePlace,
  searchPlaces,
  uvCategory,
} from '../../lib/weather';

const round = (n: number) => Math.round(n);

/**
 * Condition glyphs are emoji, which most platforms render in full colour —
 * `grayscale` holds them to the monochrome palette the dashboard is built on.
 */
const GLYPH = 'grayscale';

const weekday = (iso: string, index: number) =>
  index === 0 ? 'TODAY' : new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

const clockTime = (iso: string) =>
  iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-black py-4" style={{ borderRadius: 0 }}>
      <div className="text-[10px] font-black uppercase tracking-widest text-white/40 text-left">{label}</div>
      <div className="mt-2 text-2xl font-black text-white tabular-nums text-left">{value}</div>
      {sub && <div className="mt-1 text-[11px] uppercase tracking-widest text-white/40 text-left">{sub}</div>}
    </div>
  );
}

function LocationPicker({ onPick }: { onPick: (p: WeatherPlace) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WeatherPlace[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        setResults(await searchPlaces(query, ctrl.signal));
      } catch {
        /* aborted or offline — leave the previous results in place */
      }
    }, 250);
    return () => { window.clearTimeout(t); ctrl.abort(); };
  }, [query]);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError('This browser has no location service.'); return; }
    setBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        onPick(await describeCoords(pos.coords.latitude, pos.coords.longitude));
        setBusy(false);
      },
      () => { setError('Location permission denied.'); setBusy(false); },
      { timeout: 10_000 },
    );
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white/5 px-3" style={{ borderRadius: 0 }}>
          <MagnifyingGlassIcon className="w-4 h-4 text-white/40 flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SEARCH A CITY"
            className="w-full bg-transparent py-3 text-sm text-white placeholder:text-white/30 placeholder:tracking-widest focus:outline-none select-text"
            style={{ borderRadius: 0 }}
          />
        </div>
        <button
          onClick={useMyLocation}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-3 text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors disabled:opacity-50"
          style={{ borderRadius: 0 }}
        >
          <MapPinIcon className="w-3 h-3" />
          {busy ? 'Locating' : 'Locate'}
        </button>
      </div>

      {error && <p className="mt-2 text-[11px] uppercase tracking-widest text-white/40 text-left">{error}</p>}

      {results.length > 0 && (
        <div className="mt-2">
          {results.map((p) => (
            <button
              key={`${p.latitude},${p.longitude}`}
              onClick={() => { onPick(p); setQuery(''); setResults([]); }}
              className="w-full px-3 py-3 text-left bg-white/5 hover:bg-white hover:text-black transition-colors mb-1"
              style={{ borderRadius: 0 }}
            >
              <span className="text-sm font-bold uppercase tracking-widest">{p.name}</span>
              <span className="ml-2 text-[11px] uppercase tracking-widest opacity-60">
                {[p.admin, p.country].filter(Boolean).join(', ')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WeatherDetail({
  data,
  onClose,
  onPick,
  isDefault,
  onSetDefault,
  onUseDefault,
  hasSavedDefault,
}: {
  data: WeatherSnapshot | null;
  onClose: () => void;
  onPick: (p: WeatherPlace) => void;
  isDefault: boolean;
  onSetDefault: () => void;
  onUseDefault: () => void;
  hasSavedDefault: boolean;
}) {
  // Escape closes, and the page behind must not scroll while the sheet is up.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const aqi = data?.air.usAqi ?? null;
  const uv = data?.today?.uvIndexMax ?? 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black p-4 select-none"
      // Tailwind mis-parses vendor-prefixed arbitrary properties, so these go inline.
      style={{ WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent' }}
    >
      <div className="relative mx-auto my-8 w-full max-w-2xl bg-black p-6" style={{ borderRadius: 0 }}>
        <button
          onClick={onClose}
          aria-label="Close weather detail"
          className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors"
          style={{ borderRadius: 0 }}
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {!data ? (
          <p className="text-sm uppercase tracking-widest text-white/40 text-left">Loading forecast…</p>
        ) : (
          <>
            {/* Current conditions */}
            <div className="text-left">
              <h2 className="text-2xl font-black uppercase tracking-widest text-white pr-10">{data.place.name}</h2>
              <p className="mt-1 text-[11px] uppercase tracking-widest text-white/40">
                {[data.place.admin, data.place.country].filter(Boolean).join(', ')}
                {isDefault && ' — Default'}
              </p>
              <div className="mt-6 flex items-end gap-4">
                <span className={cn('text-6xl leading-none text-white', GLYPH)}>{conditionGlyph(data.current.code, data.current.isDay)}</span>
                <span className="text-6xl font-black leading-none text-white tabular-nums">{round(data.current.temperature)}°</span>
              </div>
              <p className="mt-3 text-sm font-bold uppercase tracking-widest text-white/70">
                {conditionLabel(data.current.code)} — H {round(data.today.max)}° L {round(data.today.min)}°
              </p>
            </div>

            {/* Next 24 hours */}
            <div className="mt-8">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 text-left">Next 24 Hours</h3>
              <div className="mt-3 flex gap-4 overflow-x-auto pb-2">
                {data.hourly.map((h) => (
                  <div key={h.time} className="flex-shrink-0 text-center">
                    <div className="text-[10px] uppercase tracking-widest text-white/40">
                      {new Date(h.time).toLocaleTimeString('en-US', { hour: 'numeric' })}
                    </div>
                    <div className={cn('my-1 text-lg text-white', GLYPH)}>{conditionGlyph(h.code)}</div>
                    <div className="text-sm font-bold text-white tabular-nums">{round(h.temperature)}°</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 7-day forecast */}
            <div className="mt-8">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 text-left">7-Day Forecast</h3>
              <div className="mt-3">
                {data.daily.map((d, i) => (
                  <div key={d.date} className="flex items-center gap-4 bg-black py-3" style={{ borderRadius: 0 }}>
                    <span className="w-16 text-[11px] font-black uppercase tracking-widest text-white/70">{weekday(d.date, i)}</span>
                    <span className={cn('w-6 text-center text-white', GLYPH)}>{conditionGlyph(d.code)}</span>
                    <span className="w-12 text-[11px] uppercase tracking-widest text-white/40 tabular-nums">
                      {d.precipitationChance > 0 ? `${d.precipitationChance}%` : ''}
                    </span>
                    <span className="ml-auto text-sm font-bold text-white tabular-nums">{round(d.max)}°</span>
                    <span className="w-10 text-right text-sm text-white/40 tabular-nums">{round(d.min)}°</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Conditions grid */}
            <div className="mt-8">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 text-left">Conditions</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Stat
                  label="Air Quality"
                  value={aqi === null ? '—' : String(round(aqi))}
                  sub={aqi === null ? 'Unavailable' : aqiCategory(aqi)}
                />
                <Stat label="Humidity" value={`${round(data.current.humidity)}%`} sub={`Feels ${round(data.current.apparentTemperature)}°`} />
                <Stat label="UV Index" value={String(round(uv))} sub={uvCategory(uv)} />
                <Stat
                  label="Wind"
                  value={`${round(data.current.windSpeed)} mph`}
                  sub={compassPoint(data.current.windDirection)}
                />
                <Stat label="Precipitation" value={`${data.current.precipitation.toFixed(2)} in`} sub={`${data.today.precipitationChance}% chance today`} />
                <Stat label="Cloud Cover" value={`${round(data.current.cloudCover)}%`} sub={conditionLabel(data.current.code)} />
                <Stat label="Pressure" value={`${round(data.current.pressure)} hPa`} sub={data.current.visibility === null ? undefined : `Visibility ${round(data.current.visibility / 1609)} mi`} />
                <Stat label="Sun" value={clockTime(data.today.sunrise)} sub={`Sets ${clockTime(data.today.sunset)}`} />
              </div>
              {data.air.pm25 !== null && (
                <p className="mt-3 text-[11px] normal-case tracking-widest text-white/40 text-left">
                  PM2.5 {data.air.pm25.toFixed(1)} · PM10 {data.air.pm10?.toFixed(1) ?? '—'} · Ozone {data.air.ozone?.toFixed(0) ?? '—'} µg/m³
                </p>
              )}
            </div>

            {/* Location */}
            <div className="mt-8">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 text-left mb-3">Location</h3>
              <LocationPicker onPick={onPick} />

              {/* Looking at a city is not the same as adopting it. Picking one
                  from the search only changes what's on screen; it becomes the
                  city the dashboard opens on when it's pinned here. */}
              {!isDefault && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={onSetDefault}
                    className="px-4 py-2 text-sm font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors"
                    style={{ borderRadius: 0 }}
                  >
                    Set {data.place.name} As Default
                  </button>
                  {hasSavedDefault && (
                    <button
                      onClick={onUseDefault}
                      className="px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
                      style={{ borderRadius: 0 }}
                    >
                      Back To Default
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Dashboard weather tile. Sits in the widget row alongside the clock and
 * calendar; a long press (touch) or a click (mouse) opens the full sheet —
 * hourly strip, 7-day forecast, air quality and the rest of the conditions.
 */
export function WeatherWidget({ className, size = '2x2' }: { className?: string; size?: string }) {
  // Two separate ideas: the city the dashboard opens on, and the city you're
  // currently looking at. Searching only moves the second one — the first
  // changes when you pin it.
  const [savedDefault, setSavedDefault] = useState<WeatherPlace | null>(() => loadSavedPlace());
  const [place, setPlace] = useState<WeatherPlace>(() => loadSavedPlace() ?? DEFAULT_PLACE);
  const [data, setData] = useState<WeatherSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    let alive = true;
    setError(false);
    fetchWeather(place, ctrl.signal)
      .then((d) => { if (alive) setData(d); })
      .catch(() => { if (alive && !ctrl.signal.aborted) setError(true); });
    // Conditions move slowly; a refresh every 10 minutes is plenty and keeps
    // the tile honest on a dashboard that stays open all day.
    const poll = window.setInterval(() => {
      fetchWeather(place).then((d) => { if (alive) setData(d); }).catch(() => {});
    }, 600_000);
    return () => { alive = false; ctrl.abort(); window.clearInterval(poll); };
  }, [place]);

  // With no city explicitly chosen, follow the device. Austin is only the
  // fallback for a denied prompt, a timeout, or a browser with no location
  // service — it shows immediately either way, so the tile is never blank
  // while the fix is pending. A geolocated place isn't saved: saving is for
  // deliberate choices, and persisting a fix would pin the widget to wherever
  // you happened to be the first time it loaded.
  useEffect(() => {
    if (loadSavedPlace() || !navigator.geolocation) return;
    let alive = true;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const located = await describeCoords(pos.coords.latitude, pos.coords.longitude);
        if (alive) setPlace(located);
      },
      () => { /* denied or unavailable — the default city stands */ },
      { timeout: 10_000, maximumAge: 900_000 },
    );
    return () => { alive = false; };
  }, []);

  const choose = (p: WeatherPlace) => { setPlace(p); setData(null); };
  const pinCurrent = () => { savePlace(place); setSavedDefault(place); };
  const backToDefault = () => { if (savedDefault) { setPlace(savedDefault); setData(null); } };

  // Coordinates round-trip through JSON and a reverse lookup, so compare them
  // at ~100m rather than exactly.
  const samePlace = (a: WeatherPlace, b: WeatherPlace) =>
    Math.abs(a.latitude - b.latitude) < 0.001 && Math.abs(a.longitude - b.longitude) < 0.001;
  const isDefault = !!savedDefault && samePlace(place, savedDefault);

  const press = useLongPress(() => setOpen(true));
  // Each size is its own view rather than the same composition scaled: a 1x1
  // is the temperature alone, a wide tile spends its width on the hours, a tall
  // one spends its height on the days, and the largest shows both.
  const cols = Number(size.split('x')[0]) || 2;
  const rows = Number(size.split('x')[1]) || 2;

  return (
    <>
      <div
        {...press}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } }}
        aria-label="Weather — open detailed forecast"
        className={cn(
          'bg-black flex flex-col cursor-pointer touch-manipulation select-none overflow-hidden',
          cols === 1 ? 'p-2' : 'p-4',
          className,
        )}
        style={{ borderRadius: 0, WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent' }}
      >
        {error ? (
          <div className="flex-1 flex items-center">
            <span className="text-[11px] uppercase tracking-widest text-white/40 text-left">Unavailable</span>
          </div>
        ) : !data ? (
          <div className="flex-1 flex items-center">
            <span className="text-[11px] uppercase tracking-widest text-white/30 text-left">Loading…</span>
          </div>
        ) : cols === 1 && rows === 1 ? (
          /* 1x1 — the temperature, and nothing else that would not be legible. */
          <div className="flex-1 flex flex-col items-start justify-between">
            <span className={cn('text-lg leading-none', GLYPH)}>{conditionGlyph(data.current.code, data.current.isDay)}</span>
            <span className="text-2xl font-black leading-none text-white tabular-nums">{round(data.current.temperature)}°</span>
          </div>
        ) : cols === 1 ? (
          /* A narrow column: temperature over the day's range, and for the
             tallest version a few days beneath it. */
          <div className="flex-1 flex flex-col gap-2 text-left">
            <span className={cn('text-xl leading-none', GLYPH)}>{conditionGlyph(data.current.code, data.current.isDay)}</span>
            <span className="text-3xl font-black leading-none text-white tabular-nums">{round(data.current.temperature)}°</span>
            <span className="text-[9px] uppercase tracking-widest text-white/40 tabular-nums">
              {round(data.today.max)}° / {round(data.today.min)}°
            </span>
            {rows >= 4 && (
              <div className="mt-auto flex flex-col gap-1">
                {data.daily.slice(1, 4).map((d, i) => (
                  <div key={d.date} className="flex items-center justify-between text-[9px] uppercase tracking-widest text-white/40 tabular-nums">
                    <span>{weekday(d.date, i + 1).slice(0, 3)}</span>
                    <span className="text-white/70">{round(d.max)}°</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={cn(
            'flex-1 min-h-0 gap-4',
            cols >= 4 && rows === 2 ? 'flex items-center' : 'flex flex-col justify-between',
          )}>
            {/* Current conditions — the part every size above 1x1 shows. */}
            <div className={cn('flex flex-col text-left shrink-0', cols >= 4 && rows === 2 ? 'w-1/3 justify-center' : 'justify-start')}>
              <div className={cn('leading-none', rows >= 4 ? 'text-5xl' : 'text-3xl', GLYPH)}>
                {conditionGlyph(data.current.code, data.current.isDay)}
              </div>
              <div className={cn('mt-2 font-black leading-none text-white tabular-nums', rows >= 4 ? 'text-6xl' : 'text-4xl')}>
                {round(data.current.temperature)}°
              </div>
              <div className="mt-2 text-[11px] font-bold uppercase tracking-widest text-white/70 truncate">{data.place.name}</div>
              <div className="text-[10px] uppercase tracking-widest text-white/40 truncate">
                {conditionLabel(data.current.code)} — H {round(data.today.max)}° L {round(data.today.min)}°
              </div>
            </div>

            {/* Wide tiles get the hours; tall ones get the days; the largest
                gets both. Each size shows what its shape has room for. */}
            {cols >= 4 && (
              // At 4x4 the hours and the days are siblings of the current block
              // rather than nested together, so the column distributes three
              // bands evenly instead of pinning two to the top and bottom with
              // a hole between them.
              <div className={cn('min-w-0 flex flex-col gap-4', rows === 2 ? 'flex-1 justify-center' : 'w-full')}>
                <div className="flex items-end justify-between gap-1">
                  {data.hourly.slice(0, rows >= 4 ? 8 : 6).map(h => (
                    <div key={h.time} className="flex flex-col items-center gap-1 min-w-0">
                      <span className="text-[9px] uppercase tracking-widest text-white/40">
                        {new Date(h.time).toLocaleTimeString('en-US', { hour: 'numeric' }).replace(' ', '')}
                      </span>
                      <span className={cn('text-sm leading-none', GLYPH)}>{conditionGlyph(h.code)}</span>
                      <span className="text-xs font-bold text-white tabular-nums">{round(h.temperature)}°</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cols >= 4 && rows >= 4 && (
              // Capped: across a 612px tile the day rows would otherwise strand
              // each temperature at the far edge from its day.
              <div className="flex flex-col gap-2 max-w-[26rem]">
                {data.daily.slice(1, 5).map((d, i) => (
                  <div key={d.date} className="flex items-center gap-3 text-[10px] uppercase tracking-widest tabular-nums">
                    <span className="w-10 text-white/40">{weekday(d.date, i + 1)}</span>
                    <span className={cn('w-4 text-center', GLYPH)}>{conditionGlyph(d.code)}</span>
                    <span className="ml-auto text-white/70">{round(d.max)}°</span>
                    <span className="w-8 text-right text-white/30">{round(d.min)}°</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tall but narrow: days instead of hours. */}
            {cols < 4 && rows >= 4 && (
              <div className="flex flex-col gap-1.5">
                {data.daily.slice(1, 5).map((d, i) => (
                  <div key={d.date} className="flex items-center gap-2 text-[10px] uppercase tracking-widest tabular-nums">
                    <span className="w-8 text-white/40">{weekday(d.date, i + 1)}</span>
                    <span className={cn('w-4 text-center', GLYPH)}>{conditionGlyph(d.code)}</span>
                    <span className="ml-auto text-white/70">{round(d.max)}°</span>
                    <span className="w-7 text-right text-white/30">{round(d.min)}°</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {open && (
        <WeatherDetail
          data={data}
          onClose={() => setOpen(false)}
          onPick={choose}
          isDefault={isDefault}
          onSetDefault={pinCurrent}
          onUseDefault={backToDefault}
          hasSavedDefault={!!savedDefault}
        />
      )}
    </>
  );
}
