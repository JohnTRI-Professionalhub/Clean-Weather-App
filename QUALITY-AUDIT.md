# Weather comparisons

November 11, 2026. These are saved checks from development, not live weather reports.

The app originally used Open-Meteo for both current temperature and forecasts. After these checks, current temperature was changed to NWS station observations for US locations. Forecasts still come from Open-Meteo.

## Chicago: why did the temperatures differ?

The app showed 49°F while Weather.com showed 56°F. The raw API value was 9.6°C, which correctly converts to 49.28°F. The requested coordinates were in Chicago, and the returned forecast grid was about 0.43 km away.

A comparison at Midway Airport gave a smaller difference:

| Source | Time, CST | Temperature |
| --- | --- | --- |
| NWS station KMDW | 9:15 AM | 51.8°F |
| Open-Meteo, requested at KMDW | 9:15 AM | 49.46°F |
| NWS station KMDW | 9:35 AM | 51.8°F |
| Open-Meteo, requested at KMDW | 9:30 AM | 50.36°F |
| Open-Meteo, requested at KMDW | 9:45 AM | 50.54°F |

The exact-time comparison was 2.34°F apart. The station measures a specific location; the model estimates weather for a nearby grid cell. A separate NWS report at 8:53 AM had no temperature value and was excluded.

Weather.com's page linked to a downtown point at 41.882, -87.632. Requesting that point from Open-Meteo still gave about 48°F around 9:30–9:45 AM, while Weather.com showed 56°F at 9:41 AM. Changing the location did not close the gap.

The app was displaying its API correctly. The remaining disagreement was between providers, but Weather.com's page did not identify its temperature station or processing well enough to explain the full difference. These checks don't establish which downtown value was closer to the actual temperature.

Sources: [NWS KMDW observations](https://api.weather.gov/stations/KMDW/observations), [Weather.com Chicago](https://weather.com/en-ZA/us/illinois/city/chicago/today).

## Bauxite

These values were read around 9:42–9:45 AM CST. The Open-Meteo sample was valid at 9:30 AM, Weather.com's page said 9:42 AM, and the NWS station report was from 9:35 AM.

| Reading | Open-Meteo | Weather.com | NWS KSUZ |
| --- | --- | --- | --- |
| Temperature | 68.36°F | 70°F | 70°F |
| Conditions | Clear | Partly cloudy | Partly cloudy |
| Humidity | 81% | 72% | 73% |
| Wind | 7 mph | 6 mph WSW | 6 mph SW |
| Today's high | 79°F | 80°F | 79°F point forecast |
| Sunrise / sunset | 6:40 AM / 5:08 PM | 6:39 AM / 5:08 PM | Not compared |

The requested city center was 34.55565, -92.52127. Open-Meteo's grid was about 1.4 km away; KSUZ was about 5.4 km away. These are nearby locations, not identical sites. The websites may also share upstream data, so agreement between them isn't necessarily independent confirmation.

Sources: [Weather.com Bauxite](https://weather.com/en-TO/us/arkansas/bauxite/postcode/72011/today), [NWS Bauxite](https://forecast.weather.gov/MapClick.php?lat=34.5751&lon=-92.5357).

## Labels that needed fixing

- The daily icon said overcast even though the daytime hours were clear. Open-Meteo uses the day's most severe condition, including overnight hours. The app now explains that.
- The app's 57°F daily low and another site's 47°F overnight low covered different periods. The app now explains that its daily range follows the calendar day.
- Daily precipitation shows the highest hourly probability. Peak daily UV is also different from a current UV reading.

These definitions come from the [Open-Meteo documentation](https://open-meteo.com/en/docs).

## After switching to station readings

Chicago displayed 52°F from KMDW, 7.1 miles from the city center. Bauxite displayed 70°F from KSUZ, 3.4 miles away. Both reports were from 9:35 AM CST and matched the station API values after rounding.

The app checks up to three listed stations within 50 km. A temperature must have quality flag V and be no older than 90 minutes. If no reading qualifies, the current temperature is unavailable and the forecast remains visible. The station and forecast each have their own timestamp.

This makes the source of the current temperature clearer. It does not mean a nearby airport has the same temperature as every neighborhood. Longer-term checks are still needed to assess availability and forecast accuracy.

## Saved responses

Each JSON file includes the request URL and retrieval time.

- `audits/bauxite-2026-11-11.json`: original Bauxite forecast.
- `audits/chicago-2026-11-11.json`: original Chicago forecast.
- `audits/chicago-followup-2026-11-11.json`: NWS reports and the follow-up forecast.
- `audits/chicago-station-match-2026-11-11.json`: KMDW station details and model values at that location.
- `audits/chicago-downtown-match-2026-11-11.json`: model values at the downtown point.
