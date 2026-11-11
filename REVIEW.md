# Development notes

November 11, 2026 · `codex/weather-staging`

## What changed

The app now uses a nearby weather station for the current temperature and Open-Meteo for the forecast. The station's name, distance, and report time appear under the temperature. Missing or old readings show as unavailable.

The hourly section has a temperature graph above the weather cards. It shows rises and drops between hours, rain chances, and wind. You can switch between 12 and 24 hours and scroll through the forecast.

Other additions include dark mode, saved cities, Fahrenheit as the default, a seven-day forecast, and sunrise/sunset details. Fonts and icons load locally.

## Fixes

- Sunrise and sunset now use the selected city's time zone.
- Daily labels stay on the correct date across daylight-saving changes.
- Missing temperatures no longer turn into zero.
- Old search results cannot replace a newer city selection.
- Failed requests show a retry message and identify any previous forecast still on screen.
- API responses are checked for incorrect units, dates, coordinates, and invalid values.
- Daily lows and rain percentages now have explanations, since weather sites don't always use the same reporting periods.

## What was checked

All 27 automated tests passed before the code was pushed. JavaScript syntax checks also passed.

Manual browser checks covered Chicago, Bauxite, and Tokyo; changing units; saving preferences; and the hourly graph. The graph was checked at a 390px mobile width without sideways page overflow.

The Chicago comparison led to the station-temperature change. The original difference wasn't a conversion bug, but the available data didn't fully explain why the providers disagreed. The numbers and sources are in [QUALITY-AUDIT.md](QUALITY-AUDIT.md).

## Still to do

- Give the observed temperature and forecast conditions more distinct sections. The shared card is still easy to misread.
- Add browser tests for city switching, failed requests, and old observations.
- Test with a screen reader, Firefox, and Safari.
- Check station availability over several days, rather than judging it from one session.
- Choose a host and check the providers' usage limits before deployment.

This version is pushed to staging. It is not merged into `main` or hosted publicly yet.
