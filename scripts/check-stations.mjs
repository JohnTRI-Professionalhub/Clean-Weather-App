import { appendFile, mkdir } from "node:fs/promises";
import { loadObservation } from "../weather.js";
const places = [
  {
    name: "Chicago",
    latitude: 41.85,
    longitude: -87.65,
    country: "United States",
  },
  {
    name: "Bauxite",
    latitude: 34.55565,
    longitude: -92.52127,
    country: "United States",
  },
  {
    name: "Seattle",
    latitude: 47.6062,
    longitude: -122.3321,
    country: "United States",
  },
];
const report = { checkedAt: new Date().toISOString(), locations: [] };
for (const place of places) {
  const started = Date.now();
  const result = await loadObservation(place, new AbortController().signal);
  report.locations.push({
    city: place.name,
    available: !!result.observation,
    durationMs: Date.now() - started,
    station: result.observation?.station ?? null,
    ageMinutes: result.observation
      ? Math.round((Date.now() / 1000 - result.observation.time) / 60)
      : null,
    distanceKm: result.observation
      ? Number(result.observation.distance.toFixed(2))
      : null,
    status: result.status,
  });
}
const folder = new URL("../local-reports/", import.meta.url);
await mkdir(folder, { recursive: true });
await appendFile(
  new URL("station-availability.jsonl", folder),
  JSON.stringify(report) + "\n",
);
console.table(report.locations);
console.log(
  "Saved one sample to local-reports/station-availability.jsonl. Run again on later days to build a history.",
);
