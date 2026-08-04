import { useEffect, useState } from 'react';
import { MapPinIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { DetailSheet } from './detail-sheet';
import { cn } from './utils';
import { useLongPress } from './use-long-press';
import { WeatherFx } from './weather-fx';
import {
  conditionKind,
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
  const aqi = data?.air.usAqi ?? null;
  const uv = data?.today?.uvIndexMax ?? 0;

  return (
    <DetailSheet onClose={onClose} label="Close weather detail">
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
    </DetailSheet>
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

  // `cqmin` is the tile's shorter edge, so it is ~264px for 2x2, 4x2 and 2x4
  // (desktop) but ~552px for 4x4. One set of percentages would therefore render
  // 4x4 at roughly double the type size of its siblings. S rescales that branch
  // so the composition reads the same across all four; 4x4 still comes out
  // larger, just proportionally rather than by a factor of two.
  const S = cols >= 4 && rows >= 4 ? 0.55 : 1;

  return (
    <>
      <div
        {...press}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } }}
        aria-label="Weather — open detailed forecast"
        className={cn(
          'relative bg-black flex flex-col cursor-pointer touch-manipulation select-none overflow-hidden',
          className,
        )}
        // `containerType: size` turns the tile into the reference box for the
        // `cq*` units below. Every dimension inside this widget is a percentage
        // of the tile's own shorter edge, so a 2x1 looks the same on a phone
        // (173x80.5) as on desktop (264x120) even though those are not the same
        // aspect ratio — which is why FitBox, with its single fixed ratio, can
        // only serve the square-only widgets.
        // No padding here on purpose: `cq*` units resolve against the nearest
        // *ancestor* container, so a `cqmin` padding on the container itself
        // would fall back to viewport units and blow the tile out. Padding
        // belongs on the readout wrapper below, which is a descendant.
        style={{
          borderRadius: 0,
          containerType: 'size',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Ambient conditions, full-bleed behind the padding. Skipped at 1x1:
            at 80px there is no room for weather to happen behind two numbers. */}
        {data && !(cols === 1 && rows === 1) && (
          <WeatherFx kind={conditionKind(data.current.code)} isDay={data.current.isDay} />
        )}

        {/* Absolutely-positioned siblings paint over static in-flow content, so
            the readout is positioned too — otherwise the canvas covers it. */}
        <div className="relative flex-1 min-h-0 flex flex-col" style={{ padding: '7cqmin' }}>
        {error ? (
          <div className="flex-1 min-h-0 flex items-center">
            <span className="uppercase tracking-widest text-white/40 text-left" style={{ fontSize: '9cqmin', lineHeight: 1.2 }}>
              Unavailable
            </span>
          </div>
        ) : !data ? (
          <div className="flex-1 min-h-0 flex items-center">
            <span className="uppercase tracking-widest text-white/30 text-left" style={{ fontSize: '9cqmin', lineHeight: 1.2 }}>
              Loading…
            </span>
          </div>
        ) : (cols === 1 && rows === 1) || (cols === 2 && rows === 2) ? (
          /* 1x1 and 2x2 — the diagonal face (variation F): the glyph big in
             the top-right, city and temperature anchored bottom-left, the two
             masses holding opposite corners. The same cqmin percentages serve
             both, so the 2x2 is the 1x1 exactly doubled — with the condition
             animation running behind it, which the 1x1 skips. */
          <div className="flex-1 min-h-0 relative">
            <span
              className={cn('absolute leading-none', GLYPH)}
              style={{ fontSize: '42cqmin', top: '-2cqmin', right: '-3cqmin' }}
            >
              {conditionGlyph(data.current.code, data.current.isDay)}
            </span>
            <div className="absolute left-0 bottom-0 flex flex-col text-left">
              <span
                className="font-black uppercase tracking-widest text-white/60 truncate"
                style={{ fontSize: '9cqmin', lineHeight: 1, marginBottom: '3cqmin', maxWidth: '80cqmin' }}
              >
                {data.place.name}
              </span>
              <span className="font-black leading-none text-white tabular-nums" style={{ fontSize: '32cqmin' }}>
                {round(data.current.temperature)}°
              </span>
            </div>
          </div>
        ) : rows === 1 ? (
          /* A single-row strip: everything on one line, since there is no
             height to stack into. 2x1 keeps it to the essentials; 4x1 has room
             for the place and the day's range as well. */
          <div className="flex-1 min-h-0 flex items-center justify-between" style={{ gap: '4cqmin' }}>
            {data.daily.slice(0, cols >= 4 ? 7 : 3).map((d, i) => (
              <div key={d.date} className="flex-1 min-w-0 flex flex-col items-center" style={{ gap: '2cqmin' }}>
                <span
                  className="uppercase tracking-widest text-white/40 truncate"
                  style={{ fontSize: '11cqmin', lineHeight: 1.1 }}
                >
                  {weekday(d.date, i).slice(0, 3)}
                </span>
                <span className={cn('leading-none', GLYPH)} style={{ fontSize: '20cqmin' }}>
                  {conditionGlyph(d.code, i === 0 ? data.current.isDay : true)}
                </span>
                {/* Today reads the live temperature; the rest can only be a
                    forecast high, so they show high over low. */}
                {i === 0 ? (
                  <span
                    className="font-black text-white tabular-nums"
                    style={{ fontSize: '20cqmin', lineHeight: 1.1 }}
                  >
                    {round(data.current.temperature)}°
                  </span>
                ) : (
                  /* High over low, stacked: inline "104°/78°" is wider than a
                     seventh of the strip and collides with the next column. */
                  <span className="flex flex-col items-center tabular-nums">
                    <span className="font-bold text-white" style={{ fontSize: '13cqmin', lineHeight: 1.15 }}>
                      {round(d.max)}°
                    </span>
                    <span className="text-white/40" style={{ fontSize: '11cqmin', lineHeight: 1.15 }}>
                      {round(d.min)}°
                    </span>
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : cols === 1 ? (
          /* One unit wide. The reading holds the top; the rest of the height
             goes to forecast — two day rows for the 1x2, five stacked
             mini-cards for the 1x4 — so the column fills instead of leaving
             its lower half dead. */
          <div className="flex-1 min-h-0 flex flex-col justify-between text-left">
            <div className="flex flex-col" style={{ gap: '3cqmin' }}>
              <span className={cn('leading-none', GLYPH)} style={{ fontSize: '26cqmin' }}>
                {conditionGlyph(data.current.code, data.current.isDay)}
              </span>
              <span className="font-black leading-none text-white tabular-nums" style={{ fontSize: '36cqmin' }}>
                {round(data.current.temperature)}°
              </span>
              <span
                className="uppercase tracking-widest text-white/40 tabular-nums"
                style={{ fontSize: '11cqmin', lineHeight: 1.1 }}
              >
                {round(data.today.max)}° / {round(data.today.min)}°
              </span>
            </div>
            {rows >= 4 ? (
              <div className="flex-1 min-h-0 flex flex-col justify-evenly" style={{ marginTop: '6cqmin' }}>
                {data.daily.slice(1, 6).map((d, i) => (
                  <div key={d.date} className="flex flex-col items-start" style={{ gap: '2cqmin' }}>
                    <span
                      className="uppercase tracking-widest text-white/40"
                      style={{ fontSize: '9cqmin', lineHeight: 1 }}
                    >
                      {weekday(d.date, i + 1).slice(0, 3)}
                    </span>
                    <div className="flex items-baseline" style={{ gap: '3cqmin' }}>
                      <span className={cn('leading-none', GLYPH)} style={{ fontSize: '12cqmin' }}>
                        {conditionGlyph(d.code)}
                      </span>
                      <span className="font-bold text-white tabular-nums" style={{ fontSize: '13cqmin', lineHeight: 1 }}>
                        {round(d.max)}°
                      </span>
                      <span className="text-white/40 tabular-nums" style={{ fontSize: '11cqmin', lineHeight: 1 }}>
                        {round(d.min)}°
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col" style={{ gap: '5cqmin' }}>
                {data.daily.slice(1, 3).map((d, i) => (
                  <div
                    key={d.date}
                    className="flex items-center justify-between uppercase tracking-widest tabular-nums"
                    style={{ fontSize: '10cqmin', lineHeight: 1 }}
                  >
                    <span className="text-white/40">{weekday(d.date, i + 1).slice(0, 3)}</span>
                    <span className={GLYPH} style={{ fontSize: '11cqmin' }}>{conditionGlyph(d.code)}</span>
                    <span className="text-white/70 font-bold">{round(d.max)}°</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              'flex-1 min-h-0',
              cols >= 4 && rows === 2 ? 'flex items-center' : 'flex flex-col justify-between',
            )}
            style={{ gap: `${8 * S}cqmin` }}
          >
            {/* Current conditions — the part every size above 1x1 shows. */}
            <div className={cn('flex flex-col text-left shrink-0', cols >= 4 && rows === 2 ? 'w-1/3 justify-center' : 'justify-start')}>
              <div className={cn('leading-none', GLYPH)} style={{ fontSize: `${14 * S}cqmin` }}>
                {conditionGlyph(data.current.code, data.current.isDay)}
              </div>
              <div
                className="font-black leading-none text-white tabular-nums"
                style={{ fontSize: `${21 * S}cqmin`, marginTop: `${3 * S}cqmin` }}
              >
                {round(data.current.temperature)}°
              </div>
              <div
                className="font-bold uppercase tracking-widest text-white/70 truncate"
                style={{ fontSize: `${5.5 * S}cqmin`, lineHeight: 1.3, marginTop: `${3 * S}cqmin` }}
              >
                {data.place.name}
              </div>
              <div
                className="uppercase tracking-widest text-white/40 truncate"
                style={{ fontSize: `${4.8 * S}cqmin`, lineHeight: 1.3 }}
              >
                {conditionLabel(data.current.code)} — H {round(data.today.max)}° L {round(data.today.min)}°
              </div>
            </div>

            {/* Wide tiles get the hours; tall ones get the days; the largest
                gets both. Each size shows what its shape has room for. */}
            {(cols >= 4 || rows >= 4) && (
              // At 4x4 the hours and the days are siblings of the current block
              // rather than nested together, so the column distributes three
              // bands evenly instead of pinning two to the top and bottom with
              // a hole between them.
              <div className={cn('min-w-0 flex flex-col', rows === 2 ? 'flex-1 justify-center' : 'w-full')}>
                <div className="flex items-end justify-between" style={{ gap: `${1.5 * S}cqmin` }}>
                  {data.hourly.slice(0, cols >= 4 ? (rows >= 4 ? 8 : 6) : 4).map(h => (
                    <div key={h.time} className="flex flex-col items-center min-w-0" style={{ gap: `${1.5 * S}cqmin` }}>
                      <span
                        className="uppercase tracking-widest text-white/40"
                        style={{ fontSize: `${4.2 * S}cqmin`, lineHeight: 1.2 }}
                      >
                        {new Date(h.time).toLocaleTimeString('en-US', { hour: 'numeric' }).replace(' ', '')}
                      </span>
                      <span className={cn('leading-none', GLYPH)} style={{ fontSize: `${6.5 * S}cqmin` }}>
                        {conditionGlyph(h.code)}
                      </span>
                      <span
                        className="font-bold text-white tabular-nums"
                        style={{ fontSize: `${5.5 * S}cqmin`, lineHeight: 1.2 }}
                      >
                        {round(h.temperature)}°
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tall tiles spend everything below the hours on six days, each
                with a temperature range bar placed on the week's shared scale
                — Apple's large-widget device. The list is flex-1/justify-evenly
                so it stretches to the tile's floor instead of leaving the
                bottom half dead. */}
            {rows >= 4 && (() => {
              const days = data.daily.slice(1, 7);
              const lo = Math.min(...days.map(d => d.min));
              const hi = Math.max(...days.map(d => d.max));
              const span = Math.max(hi - lo, 1);
              const u = (n: number) => `${cols >= 4 ? n * S : n}cqmin`;
              return (
                <div className="flex-1 min-h-0 flex flex-col justify-evenly" style={{ marginTop: u(2) }}>
                  {days.map((d, i) => (
                    <div
                      key={d.date}
                      className="flex items-center uppercase tracking-widest tabular-nums"
                      style={{ fontSize: u(5.4), lineHeight: 1.2, gap: u(3) }}
                    >
                      <span className="text-white/40" style={{ width: u(11) }}>{weekday(d.date, i + 1).slice(0, 3)}</span>
                      <span className={cn('text-center', GLYPH)} style={{ width: u(6) }}>{conditionGlyph(d.code)}</span>
                      <span className="text-right text-white/40" style={{ width: u(10) }}>{round(d.min)}°</span>
                      <span className="relative flex-1 min-w-0 bg-white/10" style={{ height: u(1.3), borderRadius: 0 }}>
                        <span
                          className="absolute top-0 bottom-0 bg-white"
                          style={{
                            left: `${((d.min - lo) / span) * 100}%`,
                            right: `${((hi - d.max) / span) * 100}%`,
                          }}
                        />
                      </span>
                      <span className="text-right font-bold text-white" style={{ width: u(10) }}>{round(d.max)}°</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
        </div>
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

