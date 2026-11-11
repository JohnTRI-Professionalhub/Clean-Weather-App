# Atmos

A weather app designed around the next decision in your day: what it feels like now, what's coming next, and when there might be a pleasant hour outside.

## Run locally

Requires Node.js 22 or newer. No dependencies to install and no API key.

```sh
node server.js
```

Open http://127.0.0.1:8001. The development server only exposes the six browser assets, and binds to localhost. It is not a production server.

## Features

- Nearby station temperature (US coverage), a switchable 12/24-hour outlook with an aligned temperature graph, hourly changes, and a seven-day forecast.
- Separate observation and model forecast cards, with the station reading's age and a link to its reports.
- An expandable hourly data table and Arrow Left/Right, Home, and End navigation when the hourly strip has keyboard focus.
- Search worldwide cities with debouncing, arrow-key selection, Enter, and Escape.
- Celsius/km/h and Fahrenheit/mph, converted from a single metric response.
- Four recent cities and preferred units saved locally, with a clear-preferences control.
- An outdoor window based on explicit daylight, temperature, wind, precipitation, and condition criteria. It is a forecast filter, not a safety assessment or weather alert system.
- Timeouts, retry controls, stale-request cancellation, and clear labeling when an older forecast remains visible after an error.
- Responsive layouts, named controls, live status messages, visible focus, reduced-motion support, and SVG weather symbols.

## Data correctness

Forecasts and city search use [Open-Meteo](https://open-meteo.com/). Forecasts are model output rather than a promise of observed conditions. See the [API documentation](https://open-meteo.com/en/docs).

The app requests Unix timestamps. Current and hourly timestamps, sunrise, and sunset are formatted in the selected city's IANA timezone. Daily aggregation labels use the response's fixed `utc_offset_seconds` to preserve the provider's calendar-day boundaries across DST changes. Missing values display as unavailable, never as zero.

The outdoor window is the first adjacent pair of daylight samples in the next 24 forecast hours with temperatures of 8–30°C, wind no greater than 25 km/h, precipitation chances no greater than 25%, and clear/cloudy weather codes. Its displayed interval spans those samples. If nothing qualifies or data is missing, the app says so. Thresholds are editorial choices, not personalized recommendations.

## Development and checks

```sh
node --test
node --check script.js
node --check weather.js
node --check server.js
```

The equivalent `npm test`, `npm run check`, and `npm run dev` scripts are available when npm is installed. Tests use Node's built-in test runner. GitHub Actions runs checks in Chicago, Tokyo, and Auckland timezone environments once the branch is pushed.

For browser regression checks, run:

```sh
node tests/browser/server.mjs
```

Open http://127.0.0.1:8002/tests and select **Run browser checks**. The 11 checks run the real app in an isolated frame with fixed API responses. They cover city switching, delayed responses, request failures and recovery, invalid or expired observations, unit changes, hourly views, and mobile overflow. This test server uses a separate origin from the live preview and makes no live weather requests. These browser checks are started manually and are not part of GitHub Actions.

To collect a live station availability sample for Chicago, Bauxite, and Seattle:

```sh
node scripts/check-stations.mjs
```

Each run records station availability, reading age, distance, and request duration in `local-reports/station-availability.jsonl`, which Git ignores. Repeat on later days to build a history; one successful sample does not establish long-term reliability. The equivalent npm scripts are `npm run test:browser` and `npm run check:stations`.

| File                    | Responsibility                                           |
| ----------------------- | -------------------------------------------------------- |
| `index.html`            | Semantic layout and accessible controls                  |
| `styles.css`            | Responsive presentation                                  |
| `script.js`             | DOM rendering, search interactions, state and storage    |
| `weather.js`            | Data formatting, request coordination, forecast rules    |
| `tests/weather.test.js` | Timezones, units, missing data, requests, forecast rules |
| `server.js`             | Local development server                                 |

## Staging workflow

Development happens on `codex/weather-staging`. Review the local app and run checks before pushing this branch. Open a pull request into `main` after review. Main remains the release baseline.

The online staging preview uses GitHub Pages: [Open Atmos](https://johntri-professionalhub.github.io/Clean-Weather-App/). The `Deploy staging preview` workflow deploys pushes to `codex/weather-staging` after syntax checks and unit tests pass in all three timezone environments. Browser regression checks remain a separate local step.

Only `index.html`, `styles.css`, `script.js`, `weather.js`, and `favicon.svg` are published. Tests, audit files, and the development server are excluded from the hosted artifact. No build step or paid hosting plan is required for this public repository. The portfolio's separate public folder is not used by this app. This URL is a public staging preview; deploying it does not merge changes into `main`.

## Boundaries and next validation

- Requires internet access for weather; no cached offline forecast.
- Refresh is available manually, on returning to the tab, and while visible after 15 minutes; observation and forecast timestamps are separate.
- Uses local system fonts and Georgia; no font downloads, ads, or analytics.
- No geolocation permission, analytics, accounts, or API secrets. Search queries and coordinates go to Open-Meteo; US city coordinates also go to api.weather.gov; no external font requests are made. Recent cities and units remain in this browser's local storage.
- Automated tests cover the data layer, with a browser regression suite available locally. The suite has passed in the in-app browser, and layouts have been checked at 320px and 390px widths. Full screen-reader testing, Safari/Firefox coverage, multi-day station availability checks, and user feedback remain release work.
- Check the provider's current usage terms and limits before public deployment.

## Station temperature and hourly chart

US current temperature uses the [NWS observation API](https://www.weather.gov/documentation/services-web-api). Nearby station metadata is cached in memory for 24 hours. The app checks the three closest listed stations within 50 km, chooses the nearest with a usable reading, and chooses its newest valid temperature from up to 12 recent reports. Only Celsius measurements with quality flag V, sensible bounds, and timestamps no older than 90 minutes (or more than five minutes in the future) qualify. A nearby station does not measure conditions at every address. NWS observations can be delayed by upstream quality control.

The observation card shows the station name, identifier, distance, observation time, reading age, and a link to station reports. No qualifying report, service failure, unsupported country or expired reading means unavailable current temperature, never a silently substituted model value. Forecasts load independently; condition icons, feels-like, wind and humidity appear in a separate model forecast card. Late responses cannot overwrite another city's weather. Browser requests use the browser's normal User-Agent; no secrets or backend are required.

The SVG hourly graph and cards use identical 96px time columns. Points show rounded displayed temperatures; changes are differences between adjacent displayed hourly values. Missing samples and non-consecutive times break the line. The scale follows the selected period, with its range stated above. Controls support 12/24 hours, horizontal navigation, and Fahrenheit/Celsius; no chart library or external assets are loaded.
