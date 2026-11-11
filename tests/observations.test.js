import test from "node:test";
import assert from "node:assert/strict";
import {
  parseObservation,
  observationFresh,
  nearbyStations,
  loadObservation,
  temperaturePlot,
} from "../weather.js";
const now = 1794411900;
const station = { id: "KAAA", name: "Test station", distance: 5 };
const observation = (
  value = 10,
  time = now,
  qc = "V",
  unitCode = "wmoUnit:degC",
) => ({
  properties: {
    timestamp: new Date(time * 1000).toISOString(),
    temperature: { value, qualityControl: qc, unitCode },
  },
});
test("observations reject missing values, failed QC, wrong units and stale/future timestamps", () => {
  assert.equal(parseObservation(observation(), station, now).temperature, 10);
  for (const f of [
    observation(null),
    observation(10, now, "Z"),
    observation(10, now, "V", "wmoUnit:degF"),
    observation(10, now - 5401),
    observation(10, now + 301),
  ])
    assert.equal(parseObservation(f, station, now), null);
  assert.equal(observationFresh({ time: now - 5401 }, now), false);
});
const feature = (id, lat, lon) => ({
  geometry: { coordinates: [lon, lat] },
  properties: { stationIdentifier: id, name: id },
});
test("station selection sorts by actual city distance and rejects distant/malformed stations", () => {
  const s = nearbyStations(
    {
      features: [
        feature("FAR", 50, 50),
        feature("KBBB", 40.1, -90),
        feature("KAAA", 40, -90),
        feature("BAD!", 40, -90),
      ],
    },
    { latitude: 40, longitude: -90 },
  );
  assert.deepEqual(
    s.map((s) => s.id),
    ["KAAA", "KBBB"],
  );
});
test("nearest unusable station falls through to valid nearby reading, using latest valid sample", async () => {
  const fetcher = async (url) => ({
    ok: true,
    json: async () =>
      url.includes("/points/")
        ? {
            properties: {
              observationStations:
                "https://api.weather.gov/gridpoints/LOT/1,2/stations",
            },
          }
        : url.includes("/gridpoints/")
          ? { features: [feature("KAAA", 40, -90), feature("KBBB", 40.1, -90)] }
          : url.includes("KAAA")
            ? { features: [observation(null)] }
            : {
                features: [
                  observation(9, now - 600),
                  observation(11, now - 300),
                ],
              },
  });
  const r = await loadObservation(
    { latitude: 40, longitude: -90, country: "United States" },
    new AbortController().signal,
    fetcher,
    now,
  );
  assert.equal(r.observation.station, "KBBB");
  assert.equal(r.observation.temperature, 11);
});
test("unsupported countries do not call NWS and failures preserve forecast-only status", async () => {
  let called = false;
  const fail = async () => {
    called = true;
    throw new Error("offline");
  };
  const r = await loadObservation(
    { country: "Japan" },
    new AbortController().signal,
    fail,
    now,
  );
  assert.equal(called, false);
  assert.equal(r.observation, null);
  const us = await loadObservation(
    { latitude: 41, longitude: -91, country: "United States" },
    new AbortController().signal,
    fail,
    now,
  );
  assert.equal(us.observation, null);
  assert.match(us.status, /unavailable/);
});
test("cancelled station lookup rejects instead of producing a successful result", async () => {
  const c = new AbortController();
  c.abort();
  await assert.rejects(
    loadObservation(
      { latitude: 42, longitude: -92, country: "United States" },
      c.signal,
      async () => {
        throw new Error("aborted");
      },
      now,
    ),
  );
});
test("chart scales negative/flat values, converts units, and never connects missing samples", () => {
  const h = [
    { time: 0, temp: 0 },
    { time: 3600, temp: 10 },
    { time: 7200, temp: null },
    { time: 10800, temp: -10 },
  ];
  const p = temperaturePlot(h, "f");
  assert.deepEqual(
    p.points.map((p) => p?.value ?? null),
    [32, 50, null, 14],
  );
  assert.equal(p.points[1].delta, 18);
  assert.equal(p.points[3].delta, null);
  assert.equal(p.segments.length, 2);
  assert.ok(
    temperaturePlot(
      [
        { time: 0, temp: 10 },
        { time: 3600, temp: 10 },
      ],
      "c",
    ).points.every((p) => Number.isFinite(p.y)),
  );
  assert.equal(
    temperaturePlot([{ time: 0, temp: null }], "f").segments.length,
    0,
  );
  assert.equal(
    temperaturePlot(
      [
        { time: 0, temp: 1 },
        { time: 7200, temp: 2 },
      ],
      "c",
    ).segments.length,
    2,
  );
});
