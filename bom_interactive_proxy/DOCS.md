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

## Dashboard Card

### Built-in iframe card

```yaml
type: iframe
url: http://HOME_ASSISTANT_HOST:8083/?place=melbourne&showFrameTime=1&animate=1&animateMode=throttle&animateInterval=2500&frameSkip=1
aspect_ratio: 100%
```

### Custom card

Use the root `README.md` section **Home Assistant Dashboard Card** for the full custom-card JS and YAML example.

## Notes

- Use `/` for new links; `/map-only` is kept only as a redirect.
- `lowPower=1` disables animation and frame-time overlay to reduce load.
- `animateMode=native` uses BOM playback; `animateMode=throttle` steps frames at fixed intervals.
- `rain` and `cleanup` are internal controls already enabled by default on `/`.
- Timezone query overrides are disabled; timezone is fixed in-app (`Australia/Melbourne`).
