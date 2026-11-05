# Market weather

Setup: copy `src/config/weather.example.ts` to `src/config/weather.local.ts` and
set `WEATHER_API_KEY` locally. Never commit the key. Direct client requests mean
the key is extractable from distributed app bundles and quota is per active device.

Backend migration 058 must be applied and the management market profile must have
verified latitude/longitude. Old/missing coordinates retain the normal background.
Weather loads independently, uses a 15-minute per-device cache and updates on
foreground/15-minute intervals while active. Network failures do not interrupt booking.
The visible provider timestamp identifies data age; stale cache is limited to one hour.

Five states: clear, hot (>=35C in clear weather), cloudy, rain and night. Rain/cloud
conditions take precedence over day/night. Animations stop in background and respect
Reduce Motion. WeatherAPI attribution is linked below the market hero.

No new native dependencies or native build were introduced. Restart/reload Metro
after configuring the local key. Management frontend still needs build/deployment.
