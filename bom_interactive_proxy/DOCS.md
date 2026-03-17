# BOM Interactive Proxy (Home Assistant App)

## Install

1. Open **Settings -> Add-ons (Apps) -> Add-on Store**.
2. Open the top-right menu -> **Repositories**.
3. Add: `https://github.com/probablydns/bom-interactive-proxy`
4. Install **BOM Interactive Proxy**.
5. Start the app.

## Access

- Main URL: `http://HOME_ASSISTANT_HOST:8083/`
- Health check: `http://HOME_ASSISTANT_HOST:8083/health`
- Test harness: `http://HOME_ASSISTANT_HOST:8083/test-harness`
- Ingress: open the add-on from the Home Assistant sidebar or add-on page
- Timezone option: set `display_timezone` in the add-on configuration to override the default `Australia/Melbourne`

If port `8083` is in use, change it in app Network settings.

## Recommended URLs

- Full-screen radar:
  - `/?place=melbourne`
- Frame/time + zoom:
  - `/?place=sydney&showFrameTime=1&zoom=9`
- Throttled animation:
  - `/?place=melbourne&animate=1&animateMode=throttle&animateInterval=2500&frameSkip=1`
- Coordinate lookup:
  - `/?coords=-37.8136,144.9631&zoom=10`
- Full path lookup:
  - `/?path=australia/victoria/central/bvic_pt042-melbourne&zoom=9`
- Duplicate suburb disambiguation:
  - `/?place=richmond,vic&zoom=12`

## Remote Access

### Home Assistant Cloud

Use Home Assistant ingress if you want this add-on to behave like other Home Assistant sidebar apps.

### `cloudflared` add-on

You can publish either:

- Home Assistant itself and then use ingress for this add-on, or
- a dedicated hostname to the raw add-on port

Ingress is preferred for the Home Assistant-native experience.

## Notes

- Use `/` for new links; `/map-only` is kept only as a redirect.
- `lowPower=1` disables animation and frame-time overlay to reduce load.
- `animateMode=native` uses BOM playback; `animateMode=throttle` steps frames at fixed intervals.
- `rain` and `cleanup` are internal controls already enabled by default on `/`.
- Timezone query overrides are disabled. Use the add-on `display_timezone` option; default is `Australia/Melbourne`.
