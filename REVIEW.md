# Staging change notes — November 11, 2026

Branch: `codex/weather-staging`
Repository: https://github.com/JohnTRI-Professionalhub/Clean-Weather-App

This update prepares Atmos for portfolio review. Publishing the staging branch does not deploy the website or merge it into `main`.

## Changed and added

- Rebuilt the weather dashboard with a responsive layout, saved dark/light themes, custom SVG weather symbols, and local fonts. No ads, analytics, external font downloads, or runtime dependencies.
- Added worldwide city search, keyboard suggestions, four remembered cities, and saved unit preferences. Fahrenheit/mph is the default; Celsius/km/h remains available.
- Current temperature now comes from nearby US weather station observations through NWS. The display identifies the station, distance from the city center, and observation timestamp.
- Open-Meteo remains the forecast provider. Conditions, feels-like, wind, humidity, and daily values are explicitly distinguished from the observed temperature.
- Added a 12/24-hour forecast strip and aligned temperature graph, hourly increases/decreases, precipitation chances, wind, and earlier/later navigation.
- Added a seven-day outlook, sunrise/sunset, daylight duration, peak UV, and an outdoor window with its selection criteria explained.

## Fixed and hardened

- Corrected time-zone handling and preserved daily calendar labels across daylight-saving transitions.
- Made forecast unit requests explicit and validated response units, coordinates, timestamps, coverage, numeric ranges, and daily high/low ordering.
- Missing values stay unavailable instead of becoming zero. Removed the silent fallback to the wrong daily bucket.
- Station temperatures require valid quality flags and recent timestamps; stale, missing, failed, or unsupported observations do not silently fall back to model temperatures.
- Added request cancellation, response-order protection, bounded timeouts, retry controls, offline messaging, and separate forecast/observation timestamps.
- Refreshes while visible or on return after 15 minutes. Expired station readings stop appearing as current temperatures.
- Clarified calendar-day lows, daily precipitation probability, and the meaning of daily condition icons.
- Corrected daylight-duration rounding and added hourly wind and temperature-change descriptions for assistive technology.

## Data investigation

Chicago's original 49°F versus 56°F discrepancy was traced to differences between upstream sources, not an app conversion error. A time-aligned airport comparison showed a smaller model discrepancy. The app now displays observed station temperature separately rather than implying the model is a measurement.

See [QUALITY-AUDIT.md](QUALITY-AUDIT.md) for the comparison, qualifications, and saved public API evidence in `audits/`. Statements there about local-only/no-push status describe the audit sessions before this staging publication.

## Validation

- All 27 automated tests passed before this commit.
- JavaScript syntax checks passed for the app, data helpers, and local server; `git diff --check` passed.
- Live browser checks covered Chicago and Bauxite station readings, Tokyo's unsupported-observation state with forecast retained, unit switching, saved Fahrenheit preference, 12/24-hour graph updates, and horizontal navigation.
- Checked the new graph at a 390px mobile viewport without document-wide horizontal overflow. No console errors were found in the checked flows.
- Added GitHub Actions to run syntax and data tests on Node 22 in Chicago, Tokyo, and Auckland time zones. Remote CI results must be checked separately after push.

## Remaining work

- Separate the observed-temperature card and forecast-condition imagery more clearly; current labels are explicit but the shared card can still imply a single source.
- Add automated end-to-end browser tests for city switching, failed requests, and stale observations.
- Complete real screen-reader testing and Safari/Firefox checks.
- Track station availability and failures over multiple days. Nearby stations do not guarantee the temperature at each address.
- Station coverage is US-only, checking up to three nearby listed stations within 50 km. Reports older than 90 minutes are excluded.
- No integrated radar or weather-alert feed; the official NWS link remains available.
- Choose hosting and review provider usage terms before deployment. This is a portfolio staging candidate, not a claim of perfect forecast accuracy or a completed accessibility audit.
