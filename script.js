const cityInput = document.querySelector("#city-search");
const searchButton = document.querySelector("#search-button");
const suggestions = document.querySelector("#suggestions");
const searchStatus = document.querySelector("#search-status");
const forecastGrid = document.querySelector("#forecast-grid");
const forecastTemplate = document.querySelector("#forecast-template");

const WEATHER_CODES = {
  0: { label: "Clear sky", icon: "SUN" },
  1: { label: "Mostly clear", icon: "SUN" },
  2: { label: "Partly cloudy", icon: "CLOUD" },
  3: { label: "Overcast", icon: "CLOUD" },
  45: { label: "Fog", icon: "FOG" },
  48: { label: "Rime fog", icon: "FOG" },
  51: { label: "Light drizzle", icon: "RAIN" },
  53: { label: "Drizzle", icon: "RAIN" },
  55: { label: "Heavy drizzle", icon: "RAIN" },
  61: { label: "Light rain", icon: "RAIN" },
  63: { label: "Rain", icon: "RAIN" },
  65: { label: "Heavy rain", icon: "RAIN" },
  71: { label: "Light snow", icon: "SNOW" },
  73: { label: "Snow", icon: "SNOW" },
  75: { label: "Heavy snow", icon: "SNOW" },
  80: { label: "Rain showers", icon: "RAIN" },
  81: { label: "Showers", icon: "RAIN" },
  82: { label: "Heavy showers", icon: "STORM" },
  95: { label: "Thunderstorm", icon: "STORM" }
};

function getWeatherDescriptor(code) {
  return WEATHER_CODES[code] || { label: "Unknown", icon: "INFO" };
}

function formatTime(value, timeZone) {
  if (!value) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone
  }).format(new Date(value));
}

function formatDateParts(value, timeZone) {
  const date = new Date(`${value}T12:00:00`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone
  }).format(date);
  const fullDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone
  }).format(date);

  return { weekday, fullDate };
}

function setText(id, text) {
  document.querySelector(id).textContent = text;
}

function renderForecast(daily, timeZone) {
  forecastGrid.innerHTML = "";

  daily.time.slice(0, 5).forEach((day, index) => {
    const node = forecastTemplate.content.firstElementChild.cloneNode(true);
    const descriptor = getWeatherDescriptor(daily.weather_code[index]);
    const { weekday, fullDate } = formatDateParts(day, timeZone);

    node.querySelector(".forecast-day").textContent = weekday;
    node.querySelector(".forecast-date").textContent = fullDate;
    node.querySelector(".forecast-icon").textContent = descriptor.icon;
    node.querySelector(".forecast-summary").textContent = descriptor.label;
    node.querySelector(".forecast-max").textContent = `${Math.round(daily.temperature_2m_max[index])} deg`;
    node.querySelector(".forecast-min").textContent = `${Math.round(daily.temperature_2m_min[index])} deg`;

    forecastGrid.appendChild(node);
  });
}

function updateCurrentView(place, data) {
  const current = data.current;
  const daily = data.daily;
  const descriptor = getWeatherDescriptor(current.weather_code);
  const timeZone = data.timezone;
  const placeName = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
  const updatedDate = new Date(current.time);

  setText("#location-name", placeName);
  setText(
    "#updated-at",
    `Updated ${new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone
    }).format(updatedDate)}`
  );
  setText("#weather-icon", descriptor.icon);
  setText("#current-temp", `${Math.round(current.temperature_2m)} deg`);
  setText("#current-summary", descriptor.label);
  setText("#feels-like", `${Math.round(current.apparent_temperature)} deg`);
  setText("#humidity", `${current.relative_humidity_2m}%`);
  setText("#wind-speed", `${Math.round(current.wind_speed_10m)} km/h`);
  setText("#pressure", `${Math.round(current.surface_pressure)} hPa`);
  setText("#uv-index", `${Math.round(current.uv_index)}`);
  setText("#visibility", `${(current.visibility / 1000).toFixed(1)} km`);
  setText("#precipitation", `${current.precipitation.toFixed(1)} mm`);
  setText("#cloud-cover", `${current.cloud_cover}%`);
  setText("#day-phase", current.is_day ? "Day" : "Night");
  setText("#sunrise", formatTime(daily.sunrise[0], timeZone));
  setText("#sunset", formatTime(daily.sunset[0], timeZone));
  setText("#moonrise", formatTime(daily.moonrise[0], timeZone));
  setText("#moonset", formatTime(daily.moonset[0], timeZone));

  renderForecast(daily, timeZone);
}

async function fetchWeather(place) {
  searchStatus.textContent = `Loading weather for ${place.name}...`;

  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "wind_speed_10m",
      "surface_pressure",
      "uv_index",
      "visibility",
      "precipitation",
      "cloud_cover",
      "weather_code",
      "is_day"
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
      "moonrise",
      "moonset"
    ].join(","),
    timezone: "auto",
    forecast_days: "5"
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);

  if (!response.ok) {
    throw new Error("Unable to load forecast data.");
  }

  const data = await response.json();
  updateCurrentView(place, data);
  searchStatus.textContent = `Showing weather for ${place.name}.`;
}

async function searchCities(query) {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`
  );

  if (!response.ok) {
    throw new Error("Unable to search cities.");
  }

  const data = await response.json();
  return data.results || [];
}

function clearSuggestions() {
  suggestions.innerHTML = "";
  suggestions.classList.remove("is-visible");
}

function renderSuggestions(results) {
  clearSuggestions();

  if (!results.length) {
    searchStatus.textContent = "No matching cities found.";
    return;
  }

  results.forEach((result) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion-btn";
    button.innerHTML = `${result.name}<span>${[result.admin1, result.country].filter(Boolean).join(", ")}</span>`;

    button.addEventListener("click", async () => {
      cityInput.value = [result.name, result.admin1, result.country].filter(Boolean).join(", ");
      clearSuggestions();
      await fetchWeather(result);
    });

    suggestions.appendChild(button);
  });

  suggestions.classList.add("is-visible");
  searchStatus.textContent = "Select a city from the suggestions below.";
}

async function handleSearch(query) {
  const trimmed = query.trim();

  if (!trimmed) {
    searchStatus.textContent = "Type a city name to begin.";
    clearSuggestions();
    return;
  }

  try {
    searchStatus.textContent = `Searching for "${trimmed}"...`;
    const results = await searchCities(trimmed);
    renderSuggestions(results);
  } catch (error) {
    clearSuggestions();
    searchStatus.textContent = error.message;
  }
}

let debounceTimer;

cityInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const query = cityInput.value;

  debounceTimer = setTimeout(() => {
    handleSearch(query);
  }, 250);
});

cityInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleSearch(cityInput.value);
  }
});

searchButton.addEventListener("click", () => {
  handleSearch(cityInput.value);
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-panel")) {
    clearSuggestions();
  }
});

async function loadDefaultCity() {
  try {
    const [defaultCity] = await searchCities("Chicago");

    if (!defaultCity) {
      throw new Error("Default city could not be loaded.");
    }

    cityInput.value = [defaultCity.name, defaultCity.admin1, defaultCity.country].filter(Boolean).join(", ");
    await fetchWeather(defaultCity);
  } catch (error) {
    searchStatus.textContent = error.message;
  }
}

loadDefaultCity();
