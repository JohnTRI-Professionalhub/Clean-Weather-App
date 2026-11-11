import test from "node:test";
import assert from "node:assert/strict";
import { dailyKey, dailyDate } from "../weather.js";
import {
  localTime,
  dayKey,
  temperature,
  tempText,
  windText,
  descriptor,
  outdoorWindow,
  nextHours,
  requestGate,
  fetchJson,
  validateForecast,
  forecastUrl,
  DEFAULT_PLACE,
  placeLabel,
} from "../weather.js";

test("Tokyo sunrise remains 6:03 AM regardless of the computer timezone", () => {
  const sunrise = Date.parse("2026-11-01T21:03:00Z") / 1000;
  assert.equal(localTime(sunrise, "Asia/Tokyo"), "6:03 AM");
  assert.equal(dayKey(sunrise, "Asia/Tokyo"), "2026-11-02");
  assert.equal(dayKey(sunrise, "America/Chicago"), "2026-11-01");
});
test("both sides of the daylight saving fallback retain the correct instant", () => {
  const opts = { hour: "numeric", minute: "2-digit", timeZoneName: "short" };
  assert.equal(
    localTime(Date.parse("2026-11-01T06:30Z") / 1000, "America/Chicago", opts),
    "1:30 AM CDT",
  );
  assert.equal(
    localTime(Date.parse("2026-11-01T07:30Z") / 1000, "America/Chicago", opts),
    "1:30 AM CST",
  );
});
test("null values never become zero, freezing point, or epoch dates", () => {
  assert.equal(tempText(null, "f"), "—");
  assert.equal(windText(null, "f"), "—");
  assert.equal(localTime(null, "Asia/Tokyo"), "—");
  assert.equal(temperature(NaN), null);
});
test("units convert correctly, including negative temperatures", () => {
  assert.equal(tempText(0, "f"), "32°");
  assert.equal(tempText(-40, "f"), "-40°");
  assert.equal(windText(16.09344, "f"), "10 mph");
});
test("all precipitation and hail codes have explicit descriptions", () => {
  for (const code of [56, 57, 66, 67, 77, 85, 86, 96, 99])
    assert.notEqual(descriptor(code).icon, "unknown");
  assert.equal(descriptor(0, 0).icon, "moon");
  assert.equal(descriptor(999).icon, "unknown");
});
const good = (time) => ({
  time,
  isDay: 1,
  rain: 10,
  wind: 10,
  temp: 18,
  code: 2,
});
test("outdoor window requires consecutive dry, mild daylight samples", () => {
  assert.equal(outdoorWindow([good(0), good(7200)]), null);
  assert.equal(outdoorWindow([good(0), { ...good(3600), rain: null }]), null);
  assert.equal(outdoorWindow([good(0), { ...good(3600), code: 95 }]), null);
  assert.equal(outdoorWindow([good(0), { ...good(3600), isDay: 0 }]), null);
  assert.equal(outdoorWindow([good(0), { ...good(3600), wind: 40 }]), null);
  assert.deepEqual(outdoorWindow([good(0), good(3600)]), [good(0), good(3600)]);
});
test("hourly forecast starts after the current timestamp and handles midnight", () => {
  const data = {
    current: { time: 4000 },
    hourly: {
      time: [0, 3600, 7200, 10800],
      temperature_2m: [1, 2, 3, 4],
      precipitation_probability: [0, 0, 10, 20],
      weather_code: [0, 0, 1, 2],
      is_day: [1, 1, 0, 0],
      wind_speed_10m: [1, 2, 3, 4],
    },
  };
  assert.deepEqual(nextHours(data, 1), [
    { time: 7200, temp: 3, rain: 10, code: 1, isDay: 0, wind: 3 },
  ]);
});
test("new requests invalidate previous responses even if fetch ignores abort", () => {
  const gate = requestGate(),
    first = gate.start(),
    second = gate.start();
  assert.equal(first.signal.aborted, true);
  assert.equal(first.isCurrent(), false);
  assert.equal(second.isCurrent(), true);
  gate.cancel();
  assert.equal(second.isCurrent(), false);
  assert.equal(second.signal.aborted, true);
});
test("HTTP and network failures produce actionable messages", async () => {
  const signal = new AbortController().signal;
  await assert.rejects(
    fetchJson("test", signal, async () => ({ ok: false, status: 429 })),
    /wait a moment/,
  );
  await assert.rejects(
    fetchJson("test", signal, async () => {
      throw new TypeError("Failed to fetch");
    }),
    /internet connection/,
  );
  await assert.rejects(
    fetchJson("test", signal, async () => ({ ok: false, status: 500 })),
    /unavailable/,
  );
});
test("timeout produces retry guidance and does not hang", async () => {
  const fetcher = (_, { signal }) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 100);
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(signal.reason);
        },
        { once: true },
      );
    });
  await assert.rejects(
    fetchJson("test", new AbortController().signal, fetcher, 5),
    /took too long/,
  );
});
test("incomplete provider responses fail before partial rendering", () => {
  assert.throws(() => validateForecast({}), /incomplete/);
  assert.throws(
    () =>
      validateForecast({
        current: { time: 100 },
        utc_offset_seconds: 0,
        timezone: "UTC",
        hourly: { time: [100] },
        daily: { time: [100] },
      }),
    /incomplete/,
  );
});
test("null measurements are valid but missing timestamp buckets are rejected", () => {
  const data = {
    current: { time: 100, temperature_2m: null },
    timezone: "UTC",
    utc_offset_seconds: 0,
    hourly: { time: [100] },
    daily: { time: [0] },
  };
  for (const key of [
    "temperature_2m",
    "precipitation_probability",
    "weather_code",
    "is_day",
    "wind_speed_10m",
  ])
    data.hourly[key] = [null];
  for (const key of [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "sunrise",
    "sunset",
    "precipitation_probability_max",
    "uv_index_max",
  ])
    data.daily[key] = [null];
  assert.equal(validateForecast(data), data);
  data.daily.time = [null];
  assert.throws(() => validateForecast(data), /incomplete/);
});
test("forecast explicitly requests timezone-safe timestamps and 7 days", () => {
  const url = new URL(forecastUrl(DEFAULT_PLACE));
  assert.equal(url.searchParams.get("timeformat"), "unixtime");
  assert.equal(url.searchParams.get("timezone"), "auto");
  assert.equal(url.searchParams.get("forecast_days"), "7");
});
test("duplicate city and region labels are collapsed", () => {
  assert.equal(
    placeLabel({ name: "Tokyo", admin1: "Tokyo", country: "Japan" }),
    "Tokyo, Japan",
  );
});
test("daily date labels preserve API calendar days across DST boundaries", () => {
  const monday = Date.parse("2026-11-02T05:00:00Z") / 1000;
  // An API response generated before fallback keeps the UTC-5 bucket boundary.
  assert.equal(dayKey(monday, "America/Chicago"), "2026-11-01");
  assert.equal(dailyKey(monday, -5 * 3600), "2026-11-02");
  assert.equal(dailyDate(monday, -5 * 3600, { weekday: "long" }), "Monday");
});
