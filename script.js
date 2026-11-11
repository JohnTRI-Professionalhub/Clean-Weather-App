import {
  DEFAULT_PLACE,
  loadObservation,
  observationFresh,
  temperaturePlot,
  finite,
  tempText,
  windText,
  percent,
  placeLabel,
  localTime,
  dayKey,
  dailyKey,
  dailyDate,
  descriptor,
  forecastUrl,
  validateForecastContext,
  forecastIsStale,
  nextHours,
  outdoorWindow,
  requestGate,
  fetchJson,
} from "./weather.js";

const $ = (id) => document.getElementById(id);
const text = (id, value) => {
  $(id).textContent = value;
};
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let observation = null;
let observationStatus = "Checking nearby weather stations…";
let hourCount = 12;
let lastSuccessfulFetch = 0;
const STORAGE_KEY = "atmos.preferences.v2";
const validPlace = (p) =>
  p &&
  typeof p.name === "string" &&
  finite(p.latitude) &&
  Math.abs(p.latitude) <= 90 &&
  finite(p.longitude) &&
  Math.abs(p.longitude) <= 180;
function readPreferences() {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      unit: p?.unit === "c" ? "c" : "f",
      recent: Array.isArray(p?.recent)
        ? p.recent.filter(validPlace).slice(0, 4)
        : [],
    };
  } catch {
    return { unit: "f", recent: [] };
  }
}
const preferences = readPreferences();
let unit = preferences.unit,
  recent = preferences.recent,
  data = null,
  currentPlace = null,
  pendingPlace = recent[0] || DEFAULT_PLACE;
let results = [],
  active = -1,
  debounce,
  composing = false;
const searchGate = requestGate(),
  weatherGate = requestGate();
function savePreferences() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ unit, recent }));
  } catch {
    /* Storage may be unavailable; the app still works. */
  }
}

// Icon markup is authored here, never supplied by API responses.
const cloud = '<path d="M8 23a5 5 0 1 1 1-9 7 7 0 0 1 13-1 5 5 0 0 1 0 10Z"/>';
const sun =
  '<circle cx="16" cy="16" r="6"/><path d="M16 3v3m0 20v3M3 16h3m20 0h3M7 7l2 2m14 14 2 2M7 25l2-2M23 9l2-2"/>';
const icons = {
  sun,
  moon: '<path d="M25 20A12 12 0 0 1 12 5a12 12 0 1 0 13 15Z"/>',
  cloud,
  partlyNight: '<path d="M17 10A6 6 0 0 1 10 3a7 7 0 0 0-4 12"/>' + cloud,
  partly:
    '<circle cx="12" cy="10" r="5"/><path d="M12 1v2M3 10H1m4-7 2 2m12-2-2 2"/>' +
    cloud,
  rain: cloud + '<path d="m10 27-1 3m8-3-1 3m8-3-1 3"/>',
  snow: cloud + '<path d="M10 26v5m-2-3h4m8-2v5m-2-3h4"/>',
  storm: cloud + '<path d="m16 22-4 6h5l-3 5"/>',
  fog: '<path d="M7 10h18M3 16h23M6 22h22M9 28h14"/>',
  unknown:
    '<circle cx="16" cy="16" r="11"/><path d="M13 12a3 3 0 1 1 5 2l-2 2v2M16 23h.01"/>',
};
function icon(code, isDay = 1) {
  return `<svg class="weather-symbol" viewBox="0 0 32 34" aria-hidden="true">${icons[descriptor(code, isDay).icon]}</svg>`;
}
const droplet =
  '<svg viewBox="0 0 12 16" aria-hidden="true"><path d="M6 1C5 4 1 7 1 10a5 5 0 0 0 10 0C11 7 7 4 6 1Z"/></svg>';

function renderRecents() {
  $("recent-cities").replaceChildren();
  for (const place of recent) {
    const button = document.createElement("button");
    button.textContent = place.name;
    button.title = placeLabel(place);
    button.setAttribute("aria-label", `Show weather for ${placeLabel(place)}`);
    button.addEventListener("click", () => loadWeather(place));
    $("recent-cities").append(button);
  }
  document.querySelector(".recent-row").hidden = !recent.length;
}
function syncUnits() {
  for (const u of ["c", "f"])
    $(`unit-${u}`).setAttribute("aria-pressed", String(u === unit));
}
function renderFreshness() {
  if (!data) return;
  const usable = observationFresh(observation);
  text(
    "forecast-asof",
    (forecastIsStale(data.current.time)
      ? "Forecast out of date · "
      : "Open-Meteo forecast · ") +
      localTime(data.current.time, data.timezone, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }),
  );
  text("current-title", usable ? "STATION OBSERVATION" : "STATION TEMPERATURE");
  text("current-temp", usable ? tempText(observation.temperature, unit) : "—");
  text(
    "updated-at",
    observation
      ? (usable ? "Observed " : "Out of date · ") +
          localTime(observation.time, data.timezone, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
          })
      : "No current observation",
  );
  text(
    "station-source",
    observation
      ? observation.name +
          " (" +
          observation.station +
          ") · " +
          (unit === "f"
            ? (observation.distance / 1.609344).toFixed(1) + " mi"
            : observation.distance.toFixed(1) + " km") +
          " from city center · via NWS"
      : observationStatus,
  );
  document.title =
    currentPlace.name +
    " · " +
    (usable
      ? tempText(observation.temperature, unit) + unit.toUpperCase()
      : "Weather") +
    " — Atmos";
}
function renderHourlyChart(hours) {
  const plot = temperaturePlot(hours, unit);
  const width = hours.length * 96;
  const lines = plot.segments
    .map(
      (segment) =>
        '<polyline points="' +
        segment.map((p) => p.x + "," + p.y).join(" ") +
        '" />',
    )
    .join("");
  const dots = plot.points
    .filter(Boolean)
    .map(
      (p) =>
        "<g><title>" +
        escape(localTime(p.time, data.timezone)) +
        ": " +
        p.value +
        "°" +
        unit.toUpperCase() +
        '</title><circle cx="' +
        p.x +
        '" cy="' +
        p.y +
        '" r="4"/><text x="' +
        p.x +
        '" y="' +
        (p.y - 14) +
        '">' +
        p.value +
        "°</text></g>",
    )
    .join("");
  $("temperature-chart").innerHTML =
    '<svg viewBox="0 0 ' +
    width +
    ' 180" role="img" aria-label="Hourly forecast temperature in degrees ' +
    (unit === "f" ? "Fahrenheit" : "Celsius") +
    '. Values and changes are listed below.">' +
    '<path class="chart-baseline" d="M0 160H' +
    width +
    '"/>' +
    lines +
    dots +
    "</svg>";
  text(
    "chart-summary",
    plot.min === null
      ? "Temperature forecast unavailable."
      : "Forecast temperature · " +
          (plot.min + 2) +
          "° to " +
          (plot.max - 2) +
          "°" +
          unit.toUpperCase() +
          " · Hourly changes shown below",
  );
}
function renderWeather() {
  const c = data.current,
    d = data.daily,
    tz = data.timezone;
  const todayIndex = d.time.findIndex(
    (time) => dailyKey(time, data.utc_offset_seconds) === dayKey(c.time, tz),
  );
  text("location-name", currentPlace.name);
  text(
    "location-detail",
    [currentPlace.admin1, currentPlace.country]
      .filter(Boolean)
      .join(" · ")
      .toUpperCase(),
  );
  text(
    "local-date",
    `${localTime(c.time, tz, { weekday: "long", month: "long", day: "numeric" })} · ${tz.replaceAll("_", " ")}`,
  );
  renderFreshness();

  text("current-unit", unit.toUpperCase());
  text(
    "current-summary",
    "Forecast: " + descriptor(c.weather_code, c.is_day).label,
  );
  $("current-icon").innerHTML = icon(c.weather_code, c.is_day);
  document
    .querySelector(".current-panel")
    .classList.toggle("night", c.is_day === 0);
  text(
    "feels-range",
    `Model feels like ${tempText(c.apparent_temperature, unit)} · High ${tempText(d.temperature_2m_max[todayIndex], unit)} · Low ${tempText(d.temperature_2m_min[todayIndex], unit)}`,
  );
  text("current-wind", `Forecast wind ${windText(c.wind_speed_10m, unit)}`);
  text(
    "current-humidity",
    `Forecast humidity ${percent(c.relative_humidity_2m)}`,
  );
  text("hourly-unit", `°${unit.toUpperCase()}`);
  const hours = nextHours(data, hourCount);
  const plot = temperaturePlot(hours, unit);
  document
    .querySelector(".hourly-scroll")
    .style.setProperty("--hours", hourCount);
  renderHourlyChart(hours);
  text("hourly-title", `The next ${hourCount} hours`);
  $("hourly-grid").style.setProperty("--hours", hourCount);
  $("hourly-grid").innerHTML = hours
    .map(
      (h, i) =>
        `<article class="hour-card" aria-label="${escape(localTime(h.time, tz, { weekday: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" }))}, ${escape(descriptor(h.code, h.isDay).label)}, ${tempText(h.temp, unit)} ${unit === "c" ? "Celsius" : "Fahrenheit"}, precipitation ${percent(h.rain)}, wind ${windText(h.wind, unit)}, change from previous hour ${plot.points[i]?.delta == null ? "unavailable" : plot.points[i].delta + " degrees"}"><span>${escape(localTime(h.time, tz, { hour: "numeric" }))}</span>${icon(h.code, h.isDay)}<strong class="hour-temp">${tempText(h.temp, unit)}</strong><span class="rain-chance">${droplet}${percent(h.rain)}</span><span class="hour-wind">${windText(h.wind, unit)}</span><span class="hour-delta">${plot.points[i]?.delta == null ? "—" : plot.points[i].delta === 0 ? "Steady" : (plot.points[i].delta > 0 ? "↑ +" : "↓ ") + plot.points[i].delta + "°"}</span></article>`,
    )
    .join("");
  const lows = d.temperature_2m_min.filter(finite),
    highs = d.temperature_2m_max.filter(finite);
  const min = Math.min(...lows),
    max = Math.max(...highs),
    span = Math.max(1, max - min);
  $("daily-list").innerHTML = d.time
    .map((time, i) => {
      const low = d.temperature_2m_min[i],
        high = d.temperature_2m_max[i],
        condition = descriptor(d.weather_code[i]).label;
      const name =
        dailyKey(time, data.utc_offset_seconds) === dayKey(c.time, tz)
          ? "Today"
          : dailyDate(time, data.utc_offset_seconds, { weekday: "short" });
      const left =
        finite(low) && finite(high)
          ? Math.max(0, ((low - min) / span) * 100)
          : 0;
      const width =
        finite(low) && finite(high)
          ? Math.max(3, ((high - low) / span) * 100)
          : 0;
      return `<li class="daily-row" aria-label="${escape(dailyDate(time, data.utc_offset_seconds, { weekday: "long", month: "short", day: "numeric" }))}: ${escape(condition)}, precipitation ${percent(d.precipitation_probability_max[i])}, low ${tempText(low, unit)}, high ${tempText(high, unit)} ${unit === "c" ? "Celsius" : "Fahrenheit"}"><span class="day-name">${name}</span><span class="day-condition">${icon(d.weather_code[i])}<span>${escape(condition)}</span></span><span class="rain-chance">${droplet}${percent(d.precipitation_probability_max[i])}</span><span class="temp-range"><span class="low">${tempText(low, unit)}</span><span class="range-track" aria-hidden="true"><span class="range-fill" style="left:${left}%;width:${width}%"></span></span><strong>${tempText(high, unit)}</strong></span></li>`;
    })
    .join("");
  const rise = d.sunrise[todayIndex],
    set = d.sunset[todayIndex];
  text("sunrise", localTime(rise, tz));
  text("sunset", localTime(set, tz));
  const duration =
    finite(rise) && finite(set) && set > rise
      ? Math.round((set - rise) / 60)
      : null;
  text(
    "daylight-note",
    duration === null
      ? "Sunrise or sunset is unavailable for this date."
      : `${Math.floor(duration / 60)}h ${duration % 60}m of daylight`,
  );
  text(
    "uv-value",
    finite(d.uv_index_max[todayIndex])
      ? d.uv_index_max[todayIndex].toFixed(1)
      : "—",
  );
  text("humidity-value", percent(c.relative_humidity_2m));
  const window = outdoorWindow(nextHours(data, 24));
  if (window) {
    text(
      "window-time",
      `${localTime(window[0].time, tz, { weekday: "short" })} · ${localTime(window[0].time, tz)}–${localTime(window[1].time, tz)}`,
    );
    text(
      "window-description",
      `A promising hour in the forecast. ${tempText(window[0].temp, unit)}${unit.toUpperCase()}, with precipitation chances at ${Math.max(...window.map((h) => h.rain))}% or less across both hourly samples.`,
    );
  } else {
    text("window-time", "No clear window just yet.");
    text(
      "window-description",
      "The next 24 hours don’t match our mild, dry daylight criteria, or some data is missing. Explore the hourly outlook to plan your day.",
    );
  }
  text(
    "window-method",
    `The first pair of consecutive daylight hours with clear or cloudy skies, precipitation probability ≤25%, wind ≤${windText(25, unit)}, and temperatures between ${tempText(8, unit)} and ${tempText(30, unit)}${unit.toUpperCase()}. The displayed window spans those two samples.`,
  );
  syncUnits();
  $("weather-content").hidden = false;
}
function showNotice(message, error = false) {
  $("notice").hidden = false;
  $("notice").classList.toggle("error", error);
  text("notice-text", message);
  $("retry").hidden = !error;
}
async function loadWeather(place) {
  searchGate.cancel();
  clearTimeout(debounce);
  closeSuggestions();
  const request = weatherGate.start();
  const stationRequest = loadObservation(place, request.signal).catch(() => ({
    observation: null,
    status: "Station request interrupted.",
  }));
  $("city-search").value = "";
  pendingPlace = place;
  text("search-status", `Loading ${place.name}…`);
  showNotice(
    `Loading ${place.name}…${currentPlace ? ` Still showing ${currentPlace.name} below.` : ""}`,
  );
  $("refresh").disabled = true;
  $("weather-content").setAttribute("aria-busy", "true");
  if (!data) {
    text("location-name", place.name);
    text(
      "location-detail",
      [place.admin1, place.country].filter(Boolean).join(" · "),
    );
  }
  try {
    const result = validateForecastContext(
      await fetchJson(forecastUrl(place), request.signal),
      place,
    );
    if (!request.isCurrent()) return;
    observation = null;
    observationStatus = "Checking nearby weather stations…";
    data = result;
    stationRequest.then((result) => {
      if (!request.isCurrent()) return;
      observation = result.observation;
      observationStatus = result.status;
      renderFreshness();
    });
    lastSuccessfulFetch = Date.now();
    currentPlace = place;
    renderWeather();
    recent = [
      place,
      ...recent.filter(
        (p) => p.latitude !== place.latitude || p.longitude !== place.longitude,
      ),
    ].slice(0, 4);
    savePreferences();
    renderRecents();
    $("notice").hidden = true;
    if (!$("city-search").value)
      text(
        "search-status",
        `Showing ${placeLabel(place)}. Search for another city above.`,
      );
    renderFreshness();
  } catch (error) {
    if (!request.isCurrent()) return;
    showNotice(
      `Couldn’t update ${place.name}. ${error.message}${currentPlace ? ` Previous forecast for ${currentPlace.name} remains below.` : ""}`,
      true,
    );
    text(
      "search-status",
      "Forecast request failed. Use Try again or choose another city.",
    );
  } finally {
    if (request.isCurrent()) {
      $("refresh").disabled = false;
      $("weather-content").setAttribute("aria-busy", "false");
    }
  }
}

function closeSuggestions() {
  results = [];
  active = -1;
  $("suggestions").hidden = true;
  $("suggestions").replaceChildren();
  $("city-search").setAttribute("aria-expanded", "false");
  $("city-search").removeAttribute("aria-activedescendant");
}
function activate(index) {
  active = index;
  [...$("suggestions").children].forEach((el, i) =>
    el.setAttribute("aria-selected", String(i === active)),
  );
  const option = $("suggestions").children[active];
  if (option) {
    $("city-search").setAttribute("aria-activedescendant", option.id);
    option.scrollIntoView({ block: "nearest" });
  }
}
function renderSuggestions(places) {
  closeSuggestions();
  results = places;
  if (!results.length) {
    text(
      "search-status",
      "No matching cities. Try a nearby city or a different spelling.",
    );
    return;
  }
  for (const [i, place] of results.entries()) {
    const option = document.createElement("li");
    option.id = `city-option-${i}`;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    option.append(document.createTextNode(place.name));
    const detail = document.createElement("span");
    detail.textContent = [place.admin1, place.country]
      .filter(Boolean)
      .join(", ");
    option.append(detail);
    option.addEventListener("pointerdown", (event) => event.preventDefault());
    option.addEventListener("click", () => loadWeather(place));
    $("suggestions").append(option);
  }
  $("suggestions").hidden = false;
  $("city-search").setAttribute("aria-expanded", "true");
  text(
    "search-status",
    `${results.length} cities found. Use the arrow keys and Enter to select.`,
  );
}
async function searchCities() {
  const query = $("city-search").value.trim();
  if (query.length < 2) {
    searchGate.cancel();
    closeSuggestions();
    text("search-status", "Enter at least two letters to find a city.");
    return;
  }
  const request = searchGate.start();
  text("search-status", `Finding “${query}”…`);
  try {
    const result = await fetchJson(
      `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: query, count: "6", language: "en", format: "json" })}`,
      request.signal,
    );
    if (request.isCurrent())
      renderSuggestions((result.results || []).filter(validPlace));
  } catch (error) {
    if (request.isCurrent()) {
      closeSuggestions();
      text("search-status", error.message);
    }
  }
}
function scheduleSearch() {
  clearTimeout(debounce);
  searchGate.cancel();
  closeSuggestions();
  if (!composing) debounce = setTimeout(searchCities, 300);
}
$("city-search").addEventListener("input", scheduleSearch);
$("city-search").addEventListener("compositionstart", () => {
  composing = true;
  clearTimeout(debounce);
  searchGate.cancel();
});
$("city-search").addEventListener("compositionend", () => {
  composing = false;
  scheduleSearch();
});
$("search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  clearTimeout(debounce);
  searchCities();
});
$("city-search").addEventListener("keydown", (event) => {
  if (event.isComposing) return;
  if (event.key === "Escape") {
    clearTimeout(debounce);
    searchGate.cancel();
    closeSuggestions();
    text("search-status", "Search dismissed.");
  }
  if (results.length && ["ArrowDown", "ArrowUp"].includes(event.key)) {
    event.preventDefault();
    activate(
      active < 0
        ? event.key === "ArrowDown"
          ? 0
          : results.length - 1
        : (active + (event.key === "ArrowDown" ? 1 : -1) + results.length) %
            results.length,
    );
  }
  if (event.key === "Enter" && active >= 0 && results[active]) {
    event.preventDefault();
    loadWeather(results[active]);
  }
});
document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest(".search-form")) {
    clearTimeout(debounce);
    searchGate.cancel();
    closeSuggestions();
  }
});
$("search-form").addEventListener("focusout", (event) => {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    clearTimeout(debounce);
    searchGate.cancel();
    closeSuggestions();
  }
});
for (const u of ["c", "f"])
  $(`unit-${u}`).addEventListener("click", () => {
    unit = u;
    savePreferences();
    syncUnits();
    if (data) {
      renderWeather();
      renderFreshness();
    }
  });
$("refresh").addEventListener("click", () =>
  loadWeather(currentPlace || pendingPlace),
);
$("retry").addEventListener("click", () => loadWeather(pendingPlace));
$("clear-history").addEventListener("click", () => {
  recent = [];
  unit = "f";
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  renderRecents();
  syncUnits();
  if (data) {
    renderWeather();
    renderFreshness();
  }
  text("search-status", "Saved cities and unit preferences cleared.");
});
syncUnits();
renderRecents();
loadWeather(pendingPlace);

// Check freshness while visible and on return, without interrupting a search.
function refreshIfDue() {
  renderFreshness();
  if (
    !document.hidden &&
    navigator.onLine &&
    currentPlace &&
    !document.querySelector("#refresh").disabled &&
    !document.querySelector("#city-search").value &&
    Date.now() - lastSuccessfulFetch > 900000
  )
    loadWeather(currentPlace);
}
document.addEventListener("visibilitychange", refreshIfDue);
window.addEventListener("online", refreshIfDue);
setInterval(refreshIfDue, 60000);
window.addEventListener("offline", () =>
  showNotice(
    "You are offline. Any forecast below was loaded earlier. Reconnect and refresh.",
    true,
  ),
);
$("hours-toggle").addEventListener("click", () => {
  hourCount = hourCount === 12 ? 24 : 12;
  $("hours-toggle").setAttribute("aria-pressed", String(hourCount === 24));
  text("hours-toggle", hourCount === 12 ? "Show 24 hours" : "Show 12 hours");
  if (data) renderWeather();
});
function setTheme(dark) {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  $("theme-toggle").setAttribute("aria-pressed", String(dark));
  text("theme-toggle", dark ? "Dark mode" : "Light mode");
  document.querySelector('meta[name="theme-color"]').content = dark
    ? "#101c22"
    : "#f6f4ee";
}
try {
  setTheme(localStorage.getItem("atmos.theme") !== "light");
} catch {
  setTheme(true);
}
$("theme-toggle").addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme !== "dark";
  setTheme(dark);
  try {
    localStorage.setItem("atmos.theme", dark ? "dark" : "light");
  } catch {}
});

for (const [id, direction] of [
  ["hours-back", -1],
  ["hours-forward", 1],
])
  $(id).addEventListener("click", () => {
    const scroller = document.querySelector(".hourly-scroll");
    scroller.scrollBy({
      left: direction * scroller.clientWidth * 0.8,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  });
