// Loaded ONLY by the isolated test server on port 8002. Never shipped by server.js.
const qa = window.parent.qa;
const baseNow = __fixtureData.data.current.time * 1000 + 600000;
Date.now = () => baseNow + (qa.clockDelta || 0);
const chicago = {
  name: "Chicago",
  admin1: "Illinois",
  country: "United States",
  latitude: 41.85,
  longitude: -87.65,
};
const bauxite = {
  name: "Bauxite",
  admin1: "Arkansas",
  country: "United States",
  latitude: 34.55565,
  longitude: -92.52127,
};
const tokyo = {
  name: "Tokyo",
  country: "Japan",
  latitude: 35.68,
  longitude: 139.69,
};
window.fetch = async (input) => {
  const url = new URL(input),
    isBauxite = url.searchParams.get("latitude") === "34.55565";
  const failForecast = qa.failForecast,
    stationMode = qa.stationMode,
    delay = qa.slowBauxite && isBauxite ? 600 : 10;
  await new Promise((resolve) => setTimeout(resolve, delay)); // Intentionally ignores abort to test response ordering.
  if (url.hostname === "geocoding-api.open-meteo.com") {
    const q = url.searchParams.get("name").toLowerCase();
    return Response.json({
      results: [chicago, bauxite, tokyo].filter((p) =>
        p.name.toLowerCase().includes(q),
      ),
    });
  }
  if (url.hostname === "api.open-meteo.com") {
    if (failForecast) return new Response("unavailable", { status: 503 });
    const d = structuredClone(__fixtureData.data);
    d.latitude = Number(url.searchParams.get("latitude"));
    d.longitude = Number(url.searchParams.get("longitude"));
    d.current.temperature_2m = isBauxite ? 20 : 10;
    return Response.json(d);
  }
  if (url.hostname === "api.weather.gov") {
    if (stationMode === "failure")
      return new Response("unavailable", { status: 503 });
    if (url.pathname.startsWith("/points/")) {
      const ar = url.pathname.includes("34.555");
      return Response.json({
        properties: {
          observationStations:
            "https://api.weather.gov/gridpoints/" +
            (ar ? "LZK" : "LOT") +
            "/1,2/stations",
        },
      });
    }
    if (url.pathname.includes("/gridpoints/")) {
      const ar = url.pathname.includes("LZK");
      return Response.json({
        features: [
          {
            geometry: {
              coordinates: ar ? [-92.52127, 34.55565] : [-87.65, 41.85],
            },
            properties: {
              stationIdentifier: ar ? "KSUZ" : "KMDW",
              name: ar
                ? "Saline County Regional Airport"
                : "Chicago Midway Airport",
            },
          },
        ],
      });
    }
    if (url.pathname.includes("/observations")) {
      const ar = url.pathname.includes("KSUZ");
      return Response.json({
        features: [
          {
            properties: {
              timestamp: new Date(
                baseNow - (stationMode === "stale" ? 7200000 : 300000),
              ).toISOString(),
              temperature: {
                unitCode: "wmoUnit:degC",
                value: stationMode === "missing" ? null : ar ? 21 : 11,
                qualityControl: stationMode === "rejected" ? "Z" : "V",
              },
            },
          },
        ],
      });
    }
  }
  throw new Error(
    "Unexpected request in isolated test: " + url.origin + url.pathname,
  );
};
window.addEventListener("error", (event) => qa.errors.push(event.message));
window.addEventListener("unhandledrejection", (event) =>
  qa.errors.push(String(event.reason)),
);
