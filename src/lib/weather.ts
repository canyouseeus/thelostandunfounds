/**
 * Weather data for the dashboard widget.
 *
 * Open-Meteo is used throughout: it needs no API key and sends permissive CORS
 * headers, so the browser can call it directly and there is no secret to keep
 * out of the bundle or a serverless function to keep warm.
 */

export interface WeatherPlace {
  name: string;
  admin: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}

export interface WeatherDay {
  date: string;
  code: number;
  max: number;
  min: number;
  precipitationChance: number;
  uvIndexMax: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherHour {
  time: string;
  temperature: number;
  code: number;
}

export interface WeatherSnapshot {
  place: WeatherPlace;
  current: {
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    code: number;
    isDay: boolean;
    windSpeed: number;
    windDirection: number;
    pressure: number;
    precipitation: number;
    cloudCover: number;
    visibility: number | null;
  };
  today: WeatherDay;
  daily: WeatherDay[];
  hourly: WeatherHour[];
  air: {
    usAqi: number | null;
    pm25: number | null;
    pm10: number | null;
    ozone: number | null;
  };
}

/** WMO weather interpretation codes: the subset Open-Meteo actually emits. */
const CONDITIONS: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime Fog',
  51: 'Light Drizzle',
  53: 'Drizzle',
  55: 'Heavy Drizzle',
  56: 'Freezing Drizzle',
  57: 'Freezing Drizzle',
  61: 'Light Rain',
  63: 'Rain',
  65: 'Heavy Rain',
  66: 'Freezing Rain',
  67: 'Freezing Rain',
  71: 'Light Snow',
  73: 'Snow',
  75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Rain Showers',
  81: 'Rain Showers',
  82: 'Violent Showers',
  85: 'Snow Showers',
  86: 'Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm + Hail',
  99: 'Thunderstorm + Hail',
};

export const conditionLabel = (code: number) => CONDITIONS[code] ?? 'Unknown';

/**
 * A single glyph per condition family. The dashboard is monochrome, so these
 * carry the whole visual read of the forecast; keep them legible at the ~40px
 * the widget renders them at.
 */
export const conditionGlyph = (code: number, isDay = true) => {
  if (code === 0) return isDay ? '☀' : '☾';
  if (code <= 2) return isDay ? '⛅' : '☁';
  if (code === 3) return '☁';
  if (code <= 48) return '≡';
  if (code <= 57) return '☂';
  if (code <= 67) return '☂';
  if (code <= 77) return '❄';
  if (code <= 82) return '☂';
  if (code <= 86) return '❄';
  return '⚡';
};

/**
 * The condition families the tile animates. Coarser than the glyph mapping on
 * purpose: drizzle, rain and rain showers all fall the same way, so they share
 * one particle system rather than three near-identical ones.
 */
export type ConditionKind = 'clear' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm';

export const conditionKind = (code: number): ConditionKind => {
  if (code === 0) return 'clear';
  if (code <= 3) return 'cloud';
  if (code <= 48) return 'fog';
  if (code <= 57) return 'rain';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'rain';
  if (code <= 86) return 'snow';
  return 'storm';
};

/** US AQI bands, matching the EPA categories Apple Weather also uses. */
export const aqiCategory = (aqi: number) => {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy: Sensitive';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};

export const uvCategory = (uv: number) => {
  if (uv < 3) return 'Low';
  if (uv < 6) return 'Moderate';
  if (uv < 8) return 'High';
  if (uv < 11) return 'Very High';
  return 'Extreme';
};

export const compassPoint = (deg: number) =>
  ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const maybe = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

async function getJson(url: string, signal?: AbortSignal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
  return res.json();
}

/** Free-text city lookup for the "change location" field. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<WeatherPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const data = await getJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`,
    signal,
  );
  return (data.results ?? []).map((r: Record<string, unknown>) => ({
    name: String(r.name),
    admin: (r.admin1 as string) ?? null,
    country: (r.country_code as string) ?? (r.country as string) ?? null,
    latitude: num(r.latitude),
    longitude: num(r.longitude),
  }));
}

/** Reverse lookup so a geolocated fix still gets a city name to display. */
export async function describeCoords(latitude: number, longitude: number, signal?: AbortSignal): Promise<WeatherPlace> {
  const fallback: WeatherPlace = { name: 'Current Location', admin: null, country: null, latitude, longitude };
  try {
    const data = await getJson(
      `https://geocoding-api.open-meteo.com/v1/search?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`,
      signal,
    );
    const r = data.results?.[0];
    if (!r) return fallback;
    return { name: String(r.name), admin: r.admin1 ?? null, country: r.country_code ?? r.country ?? null, latitude, longitude };
  } catch {
    return fallback;
  }
}

const mapDay = (d: Record<string, unknown[]>, i: number): WeatherDay => ({
  date: String(d.time[i]),
  code: num(d.weather_code[i]),
  max: num(d.temperature_2m_max[i]),
  min: num(d.temperature_2m_min[i]),
  precipitationChance: num(d.precipitation_probability_max?.[i]),
  uvIndexMax: num(d.uv_index_max?.[i]),
  sunrise: String(d.sunrise?.[i] ?? ''),
  sunset: String(d.sunset?.[i] ?? ''),
});

/**
 * One snapshot for both the widget face and the detail sheet; they read the
 * same object, so the number on the tile can never disagree with the number in
 * the expanded view.
 *
 * Air quality comes from a separate Open-Meteo host and is allowed to fail on
 * its own: a missing AQI should blank one tile, not the whole widget.
 */
export async function fetchWeather(place: WeatherPlace, signal?: AbortSignal): Promise<WeatherSnapshot> {
  const { latitude, longitude } = place;
  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,' +
    'cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,visibility' +
    '&hourly=temperature_2m,weather_code' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset' +
    '&timezone=auto&forecast_days=7&temperature_unit=fahrenheit&wind_speed_unit=mph';

  const airUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}` +
    '&current=us_aqi,pm2_5,pm10,ozone&timezone=auto';

  const [forecast, air] = await Promise.all([
    getJson(forecastUrl, signal),
    getJson(airUrl, signal).catch(() => null),
  ]);

  const c = forecast.current ?? {};
  const d = forecast.daily ?? {};
  const h = forecast.hourly ?? {};
  const daily = (d.time ?? []).map((_: string, i: number) => mapDay(d, i));

  // Start the hourly strip at the current hour rather than at midnight; a
  // forecast of hours already past is noise.
  const nowIso = String(c.time ?? '');
  const startIdx = Math.max(0, (h.time ?? []).findIndex((t: string) => t >= nowIso));
  const hourly: WeatherHour[] = (h.time ?? [])
    .slice(startIdx, startIdx + 24)
    .map((t: string, i: number) => ({
      time: t,
      temperature: num(h.temperature_2m?.[startIdx + i]),
      code: num(h.weather_code?.[startIdx + i]),
    }));

  return {
    place,
    current: {
      temperature: num(c.temperature_2m),
      apparentTemperature: num(c.apparent_temperature),
      humidity: num(c.relative_humidity_2m),
      code: num(c.weather_code),
      isDay: num(c.is_day) === 1,
      windSpeed: num(c.wind_speed_10m),
      windDirection: num(c.wind_direction_10m),
      pressure: num(c.pressure_msl),
      precipitation: num(c.precipitation),
      cloudCover: num(c.cloud_cover),
      visibility: maybe(c.visibility),
    },
    today: daily[0],
    daily,
    hourly,
    air: {
      usAqi: maybe(air?.current?.us_aqi),
      pm25: maybe(air?.current?.pm2_5),
      pm10: maybe(air?.current?.pm10),
      ozone: maybe(air?.current?.ozone),
    },
  };
}

const STORAGE_KEY = 'lu.weather.place';

export const DEFAULT_PLACE: WeatherPlace = {
  name: 'Austin',
  admin: 'Texas',
  country: 'US',
  latitude: 30.2672,
  longitude: -97.7431,
};

export function loadSavedPlace(): WeatherPlace | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.latitude === 'number' && typeof p?.longitude === 'number') return p as WeatherPlace;
  } catch {
    /* corrupt or unavailable storage just means "no saved city" */
  }
  return null;
}

export function savePlace(place: WeatherPlace) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(place));
  } catch {
    /* private mode: the city just won't persist */
  }
}
