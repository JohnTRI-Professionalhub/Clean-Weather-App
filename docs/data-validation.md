# Weather data validation

These checks were recorded on November 11, 2026. They explain why Atmos uses station observations for current temperature and keeps model forecasts separate. They are historical samples, not a measure of long-term forecast accuracy.

## Chicago: investigating a temperature difference

The original Open-Meteo response showed 9.6°C (49.28°F), while Weather.com showed 56°F. The conversion was correct and the requested coordinates were in Chicago.

A closer comparison used the NWS Midway Airport station (KMDW) and Open-Meteo forecasts requested at that station's coordinates:

| Time (CST) | NWS observation | Open-Meteo model |
| --- | --- | --- |
| 9:15 AM | 51.8°F | 49.46°F |
| 9:35 AM | 51.8°F | 50.36°F at 9:30; 50.54°F at 9:45 |

The 8:53 AM station report had no temperature and was excluded. Requesting the downtown coordinates associated with Weather.com's page did not eliminate the difference. Weather.com's reporting station and processing could not be established from the public page, so the full gap could not be attributed to a specific cause.

This supported separating measured temperature from model estimates, rather than adjusting numbers to match another website.

## Bauxite: checking location, units, and displayed values

The saved Open-Meteo response used a grid point approximately 1.4 km from the requested city center. The nearby NWS station, KSUZ, was approximately 5.4 km away.

| Metric | Open-Meteo, 9:30 AM CST | Weather.com, 9:42 AM CST | NWS KSUZ, 9:35 AM CST |
| --- | --- | --- | --- |
| Temperature | 68.36°F | 70°F | 70°F |
| Conditions | Clear | Partly cloudy | Partly cloudy |
| Humidity | 81% | 72% | 73% |
| Wind | 7 mph | 6 mph | 6 mph |

These are nearby samples with different timestamps, not simultaneous measurements at the same location. The website sources may share upstream observations. The comparison verified the app's location handling, conversion, and rendering; it did not establish which forecast was most accurate.

## Current behavior

- Current temperature comes from a qualifying nearby US station report through NWS. Live checks displayed 52°F for Chicago (KMDW) and 70°F for Bauxite (KSUZ), matching their 9:35 AM CST reports.
- Missing, stale, failed-quality, or unavailable station temperatures remain unavailable. The app does not silently substitute a model temperature.
- Condition icons, feels-like temperature, wind, humidity, hourly values, and daily forecasts come from Open-Meteo and are labeled separately.
- Daily lows cover calendar days. Daily condition icons represent the day's most severe condition, and daily precipitation percentages represent the highest hourly probability.

## Evidence and repeatable checks

Saved responses include retrieval times and request URLs:

- [Bauxite forecast](../audits/bauxite-2026-11-11.json), also used by the automated tests.
- [Initial Chicago forecast](../audits/chicago-2026-11-11.json).
- [Chicago follow-up](../audits/chicago-followup-2026-11-11.json).
- [Matched station comparison](../audits/chicago-station-match-2026-11-11.json).
- [Downtown comparison](../audits/chicago-downtown-match-2026-11-11.json).

The Node test suite covers units, coordinates, timestamps, missing data, station quality, request cancellation, and chart gaps. The local browser suite covers interaction and failure handling. Run instructions are in the [README](../README.md#development-and-checks).

`node scripts/check-stations.mjs` records another availability sample for Chicago, Bauxite, and Seattle. Reports stay in the ignored `local-reports/` folder. Availability is not the same as forecasting accuracy; evaluating accuracy requires repeated, time-aligned comparisons across locations and forecast horizons.

## Sources

- [NWS Midway station observations](https://api.weather.gov/stations/KMDW/observations)
- [NWS Bauxite area forecast](https://forecast.weather.gov/MapClick.php?lat=34.5751&lon=-92.5357)
- [Weather.com Chicago](https://weather.com/en-ZA/us/illinois/city/chicago/today)
- [Weather.com Bauxite](https://weather.com/en-TO/us/arkansas/bauxite/postcode/72011/today)
- [Open-Meteo field definitions](https://open-meteo.com/en/docs)
