import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validateForecastContext,
  forecastIsStale,
  distanceKm,
  forecastUrl,
} from "../weather.js";
const capture = JSON.parse(
  readFileSync(new URL("../audits/bauxite-2026-11-11.json", import.meta.url)),
);
const fixture = () => structuredClone(capture.data);
const now = capture.data.current.time + 600;
const check = (d) => validateForecastContext(d, capture.place, now);
test("captured Bauxite payload passes; provider grid is within 1.5 km", () => {
  assert.ok(check(fixture()));
  assert.ok(distanceKm(capture.place, capture.data) < 1.5);
  const params = new URL(forecastUrl(capture.place)).searchParams;
  assert.equal(params.get("temperature_unit"), "celsius");
  assert.equal(params.get("wind_speed_unit"), "kmh");
});
test("wrong units or a different city cannot silently render", () => {
  let d = fixture();
  d.current_units.temperature_2m = "°F";
  assert.throws(() => check(d), /units/);
  d = fixture();
  d.latitude = 41.85;
  assert.throws(() => check(d), /location/);
});
test("stale and future timestamps are rejected, age is based on provider time", () => {
  assert.throws(
    () => validateForecastContext(fixture(), capture.place, now + 3600),
    /out-of-date/,
  );
  assert.throws(
    () => validateForecastContext(fixture(), capture.place, now - 1800),
    /future/,
  );
  assert.equal(forecastIsStale(now - 3601, now), true);
  assert.equal(forecastIsStale(now - 900, now), false);
});
test("percentages, negative wind and reversed daily ranges fail validation", () => {
  let d = fixture();
  d.hourly.precipitation_probability[0] = 101;
  assert.throws(() => check(d), /invalid measurements/);
  d = fixture();
  d.current.wind_speed_10m = -1;
  assert.throws(() => check(d), /invalid measurements/);
  d = fixture();
  d.daily.temperature_2m_min[0] = 50;
  assert.throws(() => check(d), /range/);
});
test("null remains unavailable but omitted current fields fail validation", () => {
  const d = fixture();
  d.current.temperature_2m = null;
  assert.ok(check(d));
  delete d.current.temperature_2m;
  assert.throws(() => check(d), /incomplete/);
});
test("misordered timestamps and missing current-day bucket fail validation", () => {
  let d = fixture();
  d.hourly.time[1] = d.hourly.time[0];
  assert.throws(() => check(d), /out of order/);
  d = fixture();
  d.daily.time = d.daily.time.map((t) => t + 86400);
  assert.throws(() => check(d), /cover/);
});
