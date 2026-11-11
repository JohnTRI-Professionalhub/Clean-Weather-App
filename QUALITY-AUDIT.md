# Weather data audit — November 11, 2026

## Chicago follow-up

The discrepancy is in the upstream weather estimates, not our temperature conversion or an accidentally selected city. The original 9.6°C value converts to 49.28°F correctly. Weather.com's live Chicago page continued to show 56°F, now with a 9:41 AM CST timestamp. Its air-quality detail link exposes a downtown location of 41.882, -87.632; this identifies the page's area, not necessarily its temperature observation station.

To isolate location and time effects, queried the NWS KMDW observation archive and Open-Meteo's 15-minute series at KMDW's actual coordinates (-87.75528, 41.78417). At exactly 9:15 AM CST, NWS reported 11°C (51.8°F, quality flag V), versus the model's 9.7°C (49.46°F): a 2.34°F cold difference. At 9:35 AM NWS still reported 51.8°F; the model's bracketing 9:30 and 9:45 samples were 50.36°F and 50.54°F. These are nearby grid estimates, not thermometer observations at the identical physical sensor. The NWS 8:53 observation had a null temperature and was excluded.

Requesting Open-Meteo at the downtown coordinates from Weather.com's page did **not** eliminate the gap: model samples were 48.02°F at 9:30 and 48.38°F at 9:45, compared with Weather.com's 56°F at 9:41. Thus location alone does not explain it, and there is no evidence of an app-side unit or time-zone bug. Different providers' underlying models/observations and processing are the remaining source of disagreement. The available public page does not identify Weather.com's temperature station or processing sufficiently to attribute the full gap to a particular meteorological cause; we cannot establish which downtown estimate was closest to reality from these samples.

Conclusion: the app reliably presents its provider's model, with a modest cold difference in this matched airport sample. The original 7°F cross-provider discrepancy is not proof that the app is 7°F wrong, but it is also not resolved enough to claim validated citywide accuracy. Do not alter or blend values just to match Weather.com. Before an accuracy claim, collect repeated time-aligned station comparisons across multiple locations and weather situations. No GitHub push was made.

Evidence (public data saved with retrieval timestamps and request URLs):
- `audits/chicago-followup-2026-11-11.json`: NWS observation history and app API response.
- `audits/chicago-station-match-2026-11-11.json`: exact NWS station metadata and model samples requested there.
- `audits/chicago-downtown-match-2026-11-11.json`: downtown model samples.
- [NWS station observations](https://api.weather.gov/stations/KMDW/observations)
- [Weather.com Chicago](https://weather.com/en-ZA/us/illinois/city/chicago/today)

Fahrenheit is now the default for new/cleared preferences, with mph wind units. Explicit saved Celsius choices are still honored; this user's browser was switched to Fahrenheit and persistence checked after reload.

## Verdict

The sampled app values accurately reflect Open-Meteo's response for Bauxite, Arkansas. That verifies location selection, units and rendering, not forecast skill. Nearby independent sources broadly agree on temperature but differ on humidity and cloud cover. This is a useful portfolio app with clearer data semantics after this audit; a single morning cannot establish professional forecasting accuracy.

## Bauxite comparison

Retrieved around 9:42–9:45 AM CST. Open-Meteo raw capture is in `audits/bauxite-2026-11-11.json` (9:44:47 AM retrieval, 9:30 AM valid time). Website values below were read from live browser pages, since search/indexed versions returned stale October observations.

| Metric                   | Atmos / Open-Meteo      | Weather.com, Bauxite 72011 | NWS, Saline County Airport KSUZ |
| ------------------------ | ----------------------- | -------------------------- | ------------------------------- |
| Current valid/as-of time | 9:30 AM CST             | 9:42 AM CST                | 9:35 AM CST                     |
| Temperature              | 20.2°C / 68.36°F → 68°F | 70°F                       | 70°F                            |
| Current condition        | Clear                   | Partly cloudy              | Partly cloudy                   |
| Humidity                 | 81%                     | 72%                        | 73%                             |
| Wind                     | 11.9 km/h → 7 mph, 244° | 6 mph WSW                  | 6 mph SW                        |
| Today's high             | 26.3°C → 79°F           | 80°F                       | 79°F point forecast             |
| Sunrise / sunset         | 6:40 AM / 5:08 PM       | 6:39 AM / 5:08 PM          | Not compared                    |

Sources:

- [Weather.com Bauxite current weather](https://weather.com/en-TO/us/arkansas/bauxite/postcode/72011/today)
- [Weather.com Bauxite daily forecast](https://weather.com/en-TO/us/arkansas/bauxite/postcode/72011/tenday)
- [NWS Bauxite point forecast and nearby airport observation](https://forecast.weather.gov/MapClick.php?lat=34.5751&lon=-92.5357)
- [Open-Meteo field definitions](https://open-meteo.com/en/docs)

Requested city center: 34.55565, -92.52127. Provider grid: 34.558876, -92.53607, approximately 1.40 km away. NWS observation is at KSUZ (34.59, -92.48), approximately 5.4 km from the city center. NWS point forecast is at 34.5751, -92.5357, approximately 2.5 km away. These are nearby samples, not identical measurement sites or simultaneous readings. Weather.com's page identifies the Bauxite postal area; its reporting station was not established. Its data may share upstream sources with NWS, so the sites are not necessarily independent observations.

The model is about 1.6°F cooler, 8–9 percentage points more humid, and clearer than the displayed station/site conditions. These are real source differences; there is no basis to patch the app's numbers to match another website. Daily highs agree within 1°F. Tomorrow's highs diverge more: app 66°F, NWS 68°F, Weather.com 70°F. Longer-range accuracy remains unproven.

## Important interpretation issues

- Open-Meteo current conditions are 15-minute model estimates, not a live thermometer observation. The UI now states this explicitly.
- Bauxite's daily code was overcast although the current and daytime hours were clear. Open-Meteo defines the daily code as the most severe condition anywhere in the full day; the overnight hourly data contained overcast conditions. Added an explanation rather than changing provider data.
- The app's 57°F minimum for Nov 11 is a calendar-day minimum. Weather.com and NWS show 47°F for the overnight period extending into Nov 12. These do not cover the same interval. The app's Nov 12 6 AM sample is approximately 48°F. The UI now explains the calendar-day boundary.
- Daily precipitation is the maximum hourly probability, not an independently calculated chance over an entire day. The UI now states this. Peak daily UV is also not comparable to Weather.com's current UV value.
- A supplementary Chicago API capture verifies a grid within 0.43 km of the requested city center. Its 49°F model estimate differed from Weather.com's live displayed 56°F at 9:32 AM. The earlier NWS page showed 47°F at 7:53 AM and is not a simultaneous comparator. This larger discrepancy is unresolved at the meteorological level and prevents any blanket accuracy claim.

## Changes and verification

- Explicitly request Celsius and km/h and validate returned units before conversion.
- Reject distant/malformed grid coordinates, timestamps older than an hour or too far in the future, missing current-day coverage, misordered times, invalid percentages/negative wind, and reversed high/low ranges. The 50 km grid guard detects gross location errors; it is not a precision guarantee.
- Preserve legitimate null measurements as unavailable, and reject missing required current fields.
- Remove the silent fallback that used day zero when today's bucket was missing.
- Show date and time zone with the provider timestamp; mark displayed data out of date after an hour. Check for refresh every minute while visible once 15 minutes have passed, and on return/reconnection. Network errors retain the previously labeled forecast.
- Correct daylight rounding to avoid a duration ending in 60 minutes; include hourly wind in accessible labels.
- Regression tests use a saved public API response and cover corrupted units, location, timestamps, ranges, missing data and calendar coverage, in addition to the existing DST, conversion and request-race tests.

## Remaining limits

No alert feed or radar is integrated; the official forecast/alert link remains available. Real weather accuracy needs repeated, time-aligned model-versus-station comparisons over different weather events and locations, reporting errors separately by forecast horizon. The app remains a single-provider forecast display. Changes are local to `codex/weather-staging`; no deployment or remote push was performed.

## Implemented: observed temperature and hourly graph

The current-temperature display now uses nearby US station reports via NWS; it no longer substitutes Open-Meteo current temperature. All forecast fields remain Open-Meteo and are labeled separately. A missing, stale, invalid, unsupported or failed observation produces an unavailable current temperature while leaving the forecast usable. The nearest qualifying station among the three closest listed stations within 50 km is used. Reports must be within 90 minutes and have a valid numeric Celsius temperature with quality flag V. This improves provenance, not a guarantee of conditions at the user's exact address.

Live checks on November 11: Chicago displayed 52°F from KMDW, observed 9:35 AM CST, 7.1 miles from the city center. Bauxite displayed 70°F from KSUZ at the same observation time, 3.4 miles away. Both matched the station API readings obtained during development. Independent timestamps identify the model forecast and station observation. Browser requests successfully reached NWS directly.

The hourly section now includes a temperature line above aligned condition/temperature/precipitation/wind cards. Rounded hourly changes, earlier/later controls, and 12/24-hour switching are included. Missing or non-consecutive samples break the plotted line. Fahrenheit remains selected and is the default. Browser checks verified 24 chart points for 24 hours, Celsius/Fahrenheit updates, scrolling at a 390px mobile viewport without document overflow, and no application console errors in the checked flow.

Validation: 27 automated tests pass, covering observation quality, stale/future readings, missing values, wrong units, distance sorting/filtering, fallback to another station, unsupported countries, service failure, cancellation, graph gaps and conversion, plus the earlier forecast tests. Browser coverage remains the available Chromium-based preview; other browser engines and long-running field accuracy evaluation are not claimed. All changes remain local to staging; nothing has been pushed.
