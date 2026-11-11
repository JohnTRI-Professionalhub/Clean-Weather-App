# Atmos

A weather app built with HTML, CSS, and JavaScript. It shows nearby station temperatures, an hourly temperature graph, and a seven-day forecast. No ads or API keys.

## Run it

Install Node.js 22 or newer, then run:

```sh
node server.js
```

Open [localhost:8001](http://127.0.0.1:8001). There are no packages to install.

## What it does

- Search for cities and save the last four you visited.
- View 12 or 24 forecast hours, with temperature changes, rain chances, and wind.
- Switch between Fahrenheit/mph and Celsius/km/h. Fahrenheit is the default.
- Switch between dark and light mode.
- Check sunrise, sunset, UV, and the week's highs and lows.
- Find a mild, mostly dry hour outside using the criteria shown in the app.

## Where the weather comes from

**Current temperature:** [NWS station observations](https://www.weather.gov/documentation/services-web-api), available for US locations. The app shows the station name, distance, and report time. It checks up to three stations within 50 km and uses the nearest one with a valid temperature from the past 90 minutes. If no reading qualifies, the temperature is shown as unavailable.

**Forecast:** [Open-Meteo](https://open-meteo.com/en/docs). This supplies hourly and daily forecasts, condition icons, feels-like temperature, wind, and humidity. These can differ from station readings, so they are labeled separately.

Times follow the selected city's time zone. Daily lows cover a calendar day, which may differ from another site's overnight low. The hourly graph leaves gaps where temperatures are missing.

City and unit preferences stay in your browser. Weather requests send city coordinates to the providers; searches go to Open-Meteo. The app does not request your device location.

## Tests

```sh
npm test
npm run check
```

You can also run the tests directly with `node --test`. The 27 tests cover conversions, dates, missing data, station selection, request failures, and graph values. GitHub Actions is configured to run the checks in three time zones.

## Files

| File | Contents |
| --- | --- |
| `index.html` | Page layout and controls |
| `styles.css` | Layout, colors, and mobile styles |
| `script.js` | Search, page updates, and saved preferences |
| `weather.js` | API requests, station selection, conversions, and chart calculations |
| `tests/` | Automated tests |
| `server.js` | Local preview server |
| `audits/` | Saved API responses used during the weather comparisons |

## Project status

The latest work is on `codex/weather-staging`. It has not been merged into `main` or deployed.

See [REVIEW.md](REVIEW.md) for changes and unfinished work, and [QUALITY-AUDIT.md](QUALITY-AUDIT.md) for the Chicago and Bauxite comparisons.

Station coverage is US-only. There is no offline forecast, radar, or built-in alert feed. Browser checks have been manual so far; automated browser tests, screen-reader testing, and Firefox/Safari checks are still needed.
