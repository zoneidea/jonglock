# Jonglock Mobile Domains

## UAT

- Web/deep link host: `https://jonglock.zonedevnode.com`
- Management host: `https://jonglockmng.zonedevnode.com`
- API base URL: `https://jonglockapi.zonedevnode.com/api`
- Market universal link: `https://jonglock.zonedevnode.com/market?...`
- Custom scheme fallback: `jonglock://market?...`

## Production

- Web/deep link host: `https://jonglock.com`
- Management host: `https://mng.jonglock.com`
- API base URL: `https://api.jonglock.com/api`
- Market universal link: `https://jonglock.com/market?...`
- Custom scheme fallback: `jonglock://market?...`

## Runtime Selection

- Debug builds use UAT through `__DEV__`.
- Release builds use Production.
- Shared values are defined in `src/config/environment.ts`.

## Deep Link Notes

- Android intent filters accept `jonglock://market`, UAT universal links, and `https://jonglock.com/market`.
- iOS Associated Domains are configured in `ios/JonglockApp/JonglockApp.entitlements`.
- Production universal links require `https://jonglock.com/.well-known/apple-app-site-association` and Android Digital Asset Links at `https://jonglock.com/.well-known/assetlinks.json`.
