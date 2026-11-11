// Store metric values and Unix timestamps; format in the selected city's zone.
export const DEFAULT_PLACE = {
  name: "Chicago",
  admin1: "Illinois",
  country: "United States",
  latitude: 41.85,
  longitude: -87.65,
};
export const finite = (value) =>
  typeof value === "number" && Number.isFinite(value);
export const temperature = (v, u = "c") =>
  finite(v) ? Math.round(u === "f" ? (v * 9) / 5 + 32 : v) : null;
export const tempText = (v, u) => (finite(v) ? `${temperature(v, u)}°` : "—");
export const windText = (v, u) =>
  finite(v)
    ? `${Math.round(u === "f" ? v / 1.609344 : v)} ${u === "f" ? "mph" : "km/h"}`
    : "—";
export const percent = (v) => (finite(v) ? `${Math.round(v)}%` : "—");
export const placeLabel = (p) =>
  [...new Set([p.name, p.admin1, p.country].filter(Boolean))].join(", ");
export function localTime(
  seconds,
  timeZone,
  options = { hour: "numeric", minute: "2-digit" },
) {
  if (!finite(seconds)) return "—";
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone }).format(
    new Date(seconds * 1000),
  );
}
export function dayKey(seconds, timeZone) {
  if (!finite(seconds)) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(seconds * 1000));
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type).value)
    .join("-");
}
// Daily buckets use the API's fixed request-time offset. Treat their labels as
// calendar dates, not instants, so a DST change cannot turn Monday into Sunday.
export const dailyKey = (seconds, offset) => dayKey(seconds + offset, "UTC");
export const dailyDate = (seconds, offset, options) =>
  localTime(seconds + offset, "UTC", options);
const codes = {
  0: ["Clear skies", "sun"],
  1: ["Mostly clear", "sun"],
  2: ["Partly cloudy", "partly"],
  3: ["Overcast", "cloud"],
  45: ["Fog", "fog"],
  48: ["Freezing fog", "fog"],
  51: ["Light drizzle", "rain"],
  53: ["Drizzle", "rain"],
  55: ["Heavy drizzle", "rain"],
  56: ["Freezing drizzle", "snow"],
  57: ["Heavy freezing drizzle", "snow"],
  61: ["Light rain", "rain"],
  63: ["Rain", "rain"],
  65: ["Heavy rain", "rain"],
  66: ["Freezing rain", "snow"],
  67: ["Heavy freezing rain", "snow"],
  71: ["Light snow", "snow"],
  73: ["Snow", "snow"],
  75: ["Heavy snow", "snow"],
  77: ["Snow grains", "snow"],
  80: ["Light showers", "rain"],
  81: ["Showers", "rain"],
  82: ["Heavy showers", "rain"],
  85: ["Snow showers", "snow"],
  86: ["Heavy snow showers", "snow"],
  95: ["Thunderstorms", "storm"],
  96: ["Thunderstorms with hail", "storm"],
  99: ["Severe hailstorm", "storm"],
};
export function descriptor(code, isDay = 1) {
  const [label, original] = codes[code] || [
    "Conditions unavailable",
    "unknown",
  ];
  return {
    label,
    icon:
      !isDay && original === "sun"
        ? "moon"
        : !isDay && original === "partly"
          ? "partlyNight"
          : original,
  };
}
export function forecastUrl(place) {
  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: "auto",
    timeformat: "unixtime",
    forecast_days: "7",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day",
    hourly:
      "temperature_2m,precipitation_probability,weather_code,is_day,wind_speed_10m",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max",
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}
export function validateForecast(data) {
  if (
    !finite(data?.current?.time) ||
    !finite(data.utc_offset_seconds) ||
    !data.timezone ||
    !Array.isArray(data?.hourly?.time) ||
    !Array.isArray(data?.daily?.time) ||
    !data.daily.time.length ||
    !data.hourly.time.length ||
    !data.daily.time.every(finite) ||
    !data.hourly.time.every(finite)
  )
    throw new Error(
      "The weather service returned incomplete data. Please try again.",
    );
  new Intl.DateTimeFormat("en-US", { timeZone: data.timezone }).format();
  for (const [section, keys] of Object.entries({
    hourly: [
      "temperature_2m",
      "precipitation_probability",
      "weather_code",
      "is_day",
      "wind_speed_10m",
    ],
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
      "precipitation_probability_max",
      "uv_index_max",
    ],
  })) {
    if (
      keys.some(
        (key) =>
          !Array.isArray(data[section][key]) ||
          data[section][key].length !== data[section].time.length,
      )
    )
      throw new Error(
        "The weather service returned incomplete data. Please try again.",
      );
  }
  return data;
}
// Validate the provider contract before interpreting numbers as metric weather.
export function validateForecastContext(data, place, now = Date.now() / 1000) {
  validateForecast(data);
  const fail = (message) => {
    throw new Error(message);
  };
  for (const key of [
    "temperature_2m",
    "apparent_temperature",
    "relative_humidity_2m",
    "wind_speed_10m",
    "weather_code",
    "is_day",
  ])
    if (!(key in data.current))
      fail(
        "The weather service returned incomplete current conditions. Please retry.",
      );
  for (const [section, fields] of Object.entries({
    current: {
      time: "unixtime",
      temperature_2m: "°C",
      apparent_temperature: "°C",
      relative_humidity_2m: "%",
      wind_speed_10m: "km/h",
    },
    hourly: {
      time: "unixtime",
      temperature_2m: "°C",
      precipitation_probability: "%",
      wind_speed_10m: "km/h",
    },
    daily: {
      time: "unixtime",
      temperature_2m_max: "°C",
      temperature_2m_min: "°C",
      sunrise: "unixtime",
      sunset: "unixtime",
      precipitation_probability_max: "%",
    },
  })) {
    for (const [key, expected] of Object.entries(fields))
      if (data[`${section}_units`]?.[key] !== expected)
        fail("The weather service returned unexpected units. Please retry.");
  }
  if (
    !finite(data.latitude) ||
    Math.abs(data.latitude) > 90 ||
    !finite(data.longitude) ||
    Math.abs(data.longitude) > 180 ||
    distanceKm(place, data) > 50
  )
    fail(
      "The forecast location does not match the selected area. Please retry.",
    );
  if (now - data.current.time > 3600 || data.current.time - now > 900)
    fail(
      "The weather service returned an out-of-date or future forecast. Please retry.",
    );
  for (const section of ["hourly", "daily"]) {
    if (data[section].time.some((t, i, a) => i > 0 && t <= a[i - 1]))
      fail("The forecast timestamps are out of order. Please retry.");
  }
  if (
    !data.daily.time.some(
      (t) =>
        dailyKey(t, data.utc_offset_seconds) ===
        dayKey(data.current.time, data.timezone),
    ) ||
    data.hourly.time.at(-1) < data.current.time + 86400
  )
    fail(
      "The forecast does not cover the current day and next 24 hours. Please retry.",
    );
  for (const section of ["current", "hourly", "daily"]) {
    for (const [key, values] of Object.entries(data[section])) {
      if (key === "time" || key === "interval") continue;
      for (const value of Array.isArray(values) ? values : [values]) {
        if (value === null) continue; // Missing measurements remain unavailable, never zero.
        if (
          !finite(value) ||
          ((key.includes("probability") || key.includes("humidity")) &&
            (value < 0 || value > 100)) ||
          ((key.includes("wind_speed") || key.includes("uv_index")) &&
            value < 0) ||
          (key === "is_day" && value !== 0 && value !== 1)
        )
          fail(
            "The weather service returned invalid measurements. Please retry.",
          );
      }
    }
  }
  if (
    data.daily.temperature_2m_min.some(
      (v, i) =>
        finite(v) &&
        finite(data.daily.temperature_2m_max[i]) &&
        v > data.daily.temperature_2m_max[i],
    )
  )
    fail("The forecast temperature range is invalid. Please retry.");
  return data;
}
export function distanceKm(a, b) {
  const rad = (n) => (n * Math.PI) / 180;
  const h =
    Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export const forecastIsStale = (seconds, now = Date.now() / 1000) =>
  now - seconds > 3600;
export function nextHours(data, count = 12) {
  return data.hourly.time
    .map((time, index) => ({ time, index }))
    .filter((h) => h.time >= data.current.time)
    .slice(0, count)
    .map(({ time, index }) => ({
      time,
      temp: data.hourly.temperature_2m[index],
      rain: data.hourly.precipitation_probability[index],
      code: data.hourly.weather_code[index],
      isDay: data.hourly.is_day[index],
      wind: data.hourly.wind_speed_10m[index],
    }));
}
export function outdoorWindow(hours) {
  const suitable = (h) =>
    h.isDay === 1 &&
    finite(h.rain) &&
    h.rain <= 25 &&
    finite(h.wind) &&
    h.wind <= 25 &&
    finite(h.temp) &&
    h.temp >= 8 &&
    h.temp <= 30 &&
    [0, 1, 2, 3].includes(h.code);
  for (let i = 0; i < hours.length - 1; i++)
    if (
      suitable(hours[i]) &&
      suitable(hours[i + 1]) &&
      hours[i + 1].time - hours[i].time === 3600
    )
      return [hours[i], hours[i + 1]];
  return null;
}
export function requestGate() {
  let controller,
    sequence = 0;
  return {
    cancel() {
      controller?.abort();
      sequence++;
    },
    start() {
      controller?.abort();
      controller = new AbortController();
      const id = ++sequence;
      return { signal: controller.signal, isCurrent: () => id === sequence };
    },
  };
}
export async function fetchJson(url, signal, fetcher = fetch, timeout = 12000) {
  try {
    const response = await fetcher(url, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(timeout)]),
    });
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "Too many requests. Please wait a moment and retry."
          : "The weather service is unavailable. Please try again.",
      );
    return await response.json();
  } catch (error) {
    if (signal.aborted) throw error;
    if (error.name === "TimeoutError")
      throw new Error("The request took too long. Please try again.");
    if (error instanceof TypeError)
      throw new Error(
        "Could not connect. Check your internet connection and retry.",
      );
    throw error;
  }
}

// Station observations are kept separate from all model forecast values.
export const observationFresh = (o, now = Date.now() / 1000) =>
  !!o && finite(o.time) && now - o.time <= 5400 && o.time - now <= 300;
export function parseObservation(feature, station, now = Date.now() / 1000) {
  const p = feature?.properties,
    t = p?.temperature;
  if (
    !p ||
    t?.unitCode !== "wmoUnit:degC" ||
    t.qualityControl !== "V" ||
    !finite(t.value) ||
    t.value < -100 ||
    t.value > 65
  )
    return null;
  const result = {
    time: Date.parse(p.timestamp) / 1000,
    temperature: t.value,
    station: station.id,
    name: station.name,
    distance: station.distance,
  };
  return observationFresh(result, now) ? result : null;
}
export function nearbyStations(collection, place) {
  return (collection?.features || [])
    .flatMap((f) => {
      const [longitude, latitude] = f.geometry?.coordinates || [];
      const id = f.properties?.stationIdentifier;
      if (
        !finite(latitude) ||
        Math.abs(latitude) > 90 ||
        !finite(longitude) ||
        Math.abs(longitude) > 180 ||
        !/^[A-Z0-9]{3,8}$/.test(id || "")
      )
        return [];
      const distance = distanceKm(place, { latitude, longitude });
      return distance <= 50
        ? [{ id, name: f.properties.name || id, distance }]
        : [];
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);
}
const stationCache = new Map();
export async function loadObservation(
  place,
  signal,
  fetcher = fetch,
  now = Date.now() / 1000,
) {
  if (place.country !== "United States" && place.country_code !== "US")
    return {
      observation: null,
      status: "Station observations currently cover US locations only.",
    };
  const get = (url) => fetchJson(url, signal, fetcher, 8000);
  try {
    const key = `${place.latitude.toFixed(4)},${place.longitude.toFixed(4)}`;
    let cached = stationCache.get(key);
    if (!cached || now - cached.time > 86400) {
      const point = await get(`https://api.weather.gov/points/${key}`);
      const url = point.properties?.observationStations;
      if (
        !/^https:\/\/api\.weather\.gov\/gridpoints\/[A-Z]{3}\/[0-9]+,[0-9]+\/stations$/.test(
          url || "",
        )
      )
        throw new Error("No stations");
      cached = { time: now, stations: nearbyStations(await get(url), place) };
      if (stationCache.size >= 30) stationCache.clear();
      stationCache.set(key, cached);
    }
    const candidates = await Promise.allSettled(
      cached.stations.map(async (station) => {
        const response = await get(
          `https://api.weather.gov/stations/${station.id}/observations?limit=12`,
        );
        return (
          (response.features || [])
            .map((f) => parseObservation(f, station, now))
            .filter(Boolean)
            .sort((a, b) => b.time - a.time)[0] || null
        );
      }),
    );
    if (signal.aborted) throw signal.reason;
    const observation =
      candidates.find((r) => r.status === "fulfilled" && r.value)?.value ||
      null;
    return {
      observation,
      status: observation
        ? ""
        : "No verified temperature within 50 km from the past 90 minutes. Forecast remains available.",
    };
  } catch (error) {
    if (signal.aborted) throw error;
    return {
      observation: null,
      status:
        "Station service unavailable. Forecast remains available; refresh to retry.",
    };
  }
}
// Return separate line segments so missing hours are never bridged by the chart.
export function temperaturePlot(hours, unit) {
  const values = hours.map((h) => temperature(h.temp, unit));
  const valid = values.filter(finite);
  if (!valid.length) return { segments: [], points: [], min: null, max: null };
  const min = Math.min(...valid) - 2,
    max = Math.max(...valid) + 2;
  const points = values.map((v, i) =>
    v === null
      ? null
      : {
          x: 48 + i * 96,
          y: 150 - ((v - min) / (max - min)) * 110,
          value: v,
          time: hours[i].time,
          delta:
            i &&
            finite(values[i - 1]) &&
            hours[i].time - hours[i - 1].time === 3600
              ? v - values[i - 1]
              : null,
        },
  );
  const segments = [];
  let segment = [];
  points.forEach((p, i) => {
    if (!p || (i && hours[i].time - hours[i - 1].time !== 3600)) {
      if (segment.length) segments.push(segment);
      segment = [];
    }
    if (p) segment.push(p);
  });
  if (segment.length) segments.push(segment);
  return { segments, points, min, max };
}
