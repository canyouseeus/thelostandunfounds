import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, MapPinIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { cn } from './utils';
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

/**
 * Opens the detail sheet on a long press where that's the natural gesture
 * (touch) and on a plain click where it isn't (mouse). Movement or an early
 * release cancels, so a scroll that starts on the tile doesn't open anything.
 */
function useLongPress(onOpen: () => void, ms = 450) {
  const timer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      fired.current = false;
      if (e.pointerType === 'mouse') return;
      origin.current = { x: e.clientX, y: e.clientY };
      timer.current = window.setTimeout(() => {
        fired.current = true;
        // The press has become a long press — give the haptic confirmation the
        // gesture normally carries on a phone, where there's no cursor to show
        // that anything registered.
        navigator.vibrate?.(8);
        onOpen();
      }, ms);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!origin.current) return;
      const { x, y } = origin.current;
      if (Math.abs(e.clientX - x) > 10 || Math.abs(e.clientY - y) > 10) clear();
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onClick: (e: React.MouseEvent) => {
      // Mouse clicks open directly; a touch that already fired must not open twice.
      if (fired.current) { e.preventDefault(); return; }
      if (e.detail === 0) return;
      onOpen();
    },
    // A long press on a phone otherwise raises the OS text/context menu.
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}

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
            className="w-full bg-transparent py-3 text-sm text-white placeholder:text-white/30 placeholder:tracking-widest focus:outline-none"
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
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black p-4">
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
export function WeatherWidget({ className }: { className?: string }) {
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

  return (
    <>
      <div
        {...press}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } }}
        aria-label="Weather — open detailed forecast"
        className={cn(
          'bg-black p-6 flex flex-col select-none cursor-pointer touch-manipulation min-h-[120px] md:min-h-[200px]',
          // Rendered inside FitBox's 440px square, so these sizes are a design
          // size and get scaled to the cell — big enough to fill the tile.
          className,
        )}
        style={{ borderRadius: 0 }}
      >
        <span className="text-sm font-black uppercase tracking-widest text-white/40 text-left">Weather</span>

        {error ? (
          <div className="flex-1 flex items-center">
            <span className="text-[11px] uppercase tracking-widest text-white/40 text-left">Unavailable</span>
          </div>
        ) : !data ? (
          <div className="flex-1 flex items-center">
            <span className="text-[11px] uppercase tracking-widest text-white/30 text-left">Loading…</span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center text-left">
            <div className={cn('text-7xl leading-none text-white', GLYPH)}>{conditionGlyph(data.current.code, data.current.isDay)}</div>
            <div className="mt-4 text-8xl font-black leading-none text-white tabular-nums tracking-tight">{round(data.current.temperature)}°</div>
            <div className="mt-5 text-lg font-black uppercase tracking-widest text-white truncate">{data.place.name}</div>
            <div className="mt-2 text-sm uppercase tracking-widest text-white/50 truncate">
              {conditionLabel(data.current.code)}
            </div>
            <div className="mt-1 text-sm uppercase tracking-widest text-white/50 tabular-nums">
              H {round(data.today.max)}° L {round(data.today.min)}°
            </div>
          </div>
        )}

        <span className="text-xs uppercase tracking-widest text-white/25 text-left">Hold for detail</span>
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
