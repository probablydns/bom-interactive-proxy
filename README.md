# BOM Interactive Proxy

Interactive BOM weather map proxy for local browser use, Home Assistant dashboards, and kiosk-style displays.

## Known-Good Release

- Verified working release: `1.0.67`
- Verified access paths:
  - Home Assistant ingress / `Open Web UI`
  - direct raw port access on `:8083`

If you are debugging older behavior, first confirm the live response header is `X-BOM-Proxy-Version: 1.0.67`.

## What This Service Does

- Proxies BOM web/API traffic to one local origin.
- Rewrites upstream host references so embedded map assets load cleanly.
- Serves a full-screen radar map at `/`.
- Supports frame counter/time overlays and optional throttled animation.
- Caches upstream map/tile traffic in nginx (plus browser cache).

## Endpoints

- `/` canonical full-screen map page (recommended)
- `/map` direct map page (advanced use)
- `/map-only` legacy redirect to `/`
- `/map-only.html` legacy redirect to `/`
- `/bom-interactive-proxy-card.js` `BOM Interactive Proxy Card` Lovelace resource
- `/test-harness` smoke test page
- `/debug-harness` diagnostics page
- `/health` health check (`OK`)

## Install

### Home Assistant App/Add-on (Recommended)

1. Open **Settings -> Add-ons (Apps) -> Add-on Store**.
2. Open the top-right menu -> **Repositories**.
3. Add `https://github.com/probablydns/bom-interactive-proxy`.
4. Install **BOM Interactive Proxy**.
5. Start the app.

### Docker Run (Prebuilt)

```bash
docker run -d \
  --name bom-interactive-proxy \
  -p 8083:80 \
  -e NGINX_CACHE_PATH=/var/cache/bom \
  -e NGINX_CACHE_INACTIVE=24h \
  -e NGINX_CACHE_MAX_SIZE=2g \
  -v /your/host/cache/path:/var/cache/bom \
  --restart unless-stopped \
  ghcr.io/probablydns/bom-interactive-proxy:latest
```

### Docker Compose (Prebuilt)

```yaml
services:
  bom-interactive-proxy:
    image: ghcr.io/probablydns/bom-interactive-proxy:latest
    container_name: bom-interactive-proxy
    ports:
      - "8083:80"
    environment:
      - NGINX_CACHE_PATH=/var/cache/bom
      - NGINX_CACHE_INACTIVE=24h
      - NGINX_CACHE_MAX_SIZE=2g
    volumes:
      - /your/host/cache/path:/var/cache/bom
    restart: unless-stopped
```

### Build From Source

```bash
git clone https://github.com/probablydns/bom-interactive-proxy.git
cd bom-interactive-proxy
docker build -t bom-interactive-proxy:local .
docker rm -f bom-interactive-proxy 2>/dev/null || true
docker run -d --name bom-interactive-proxy -p 8083:80 bom-interactive-proxy:local
```

## URL Parameters (Canonical)

Use these on `/` (recommended) or `/map`.

| Parameter | Type | Default on `/` | Description |
|---|---|---|---|
| `path` | string | none | Full BOM location path. If set, no place/coords lookup is done. |
| `place` | string | none | Place lookup via BOM API. Supports disambiguation like `richmond,vic`. |
| `coords` | `lat,lon` string | none | Coordinate lookup, e.g. `-37.8136,144.9631`. |
| `zoom` | integer (`0..20`) | none | Target zoom level. |
| `zoomStart` | integer (`0..20`) | none | Optional initial zoom stage before final zoom. |
| `showFrameTime` | boolean | `1` | Shows frame counter and timestamp overlay. |
| `showZoomStatus` | boolean | `1` | Shows "Applying map zoom..." while waiting for zoom settle when `zoom` is used. |
| `showTownNames` | boolean | `1` | Enables town/city labels layer. |
| `interactive` | boolean | `1` | Enables drag/pan interactions. |
| `animate` | boolean | `1` | Enables timeline autoplay behavior. |
| `animateMode` | `native` or `throttle` | `native` | Animation strategy (see below). |
| `animateInterval` | integer ms (`500..30000`) | `2000` | Step interval used by `animateMode=throttle`. |
| `frameSkip` | integer (`1..6`) | `1` | Frames advanced per throttle step. |
| `lowPower` | boolean | `0` | Applies reduced-workload behavior (see below). |
| `cb` | string | none | Cache-bust token for client troubleshooting. |

Advanced/internal flags (usually not needed on `/`):

- `mapOnly=1` enables map-only behavior on `/map`.
- `rain=1` forces rain-tab workflow.
- `cleanup=1` forces repeated page chrome cleanup.

Runtime timezone defaults to `Australia/Melbourne` and can now be overridden with the add-on `display_timezone` option or the Docker `DISPLAY_TIMEZONE` environment variable. Query-string timezone override is not supported.

## Behavior Notes

### Root (`/`) defaults

`/` behaves like map-only mode by default and internally applies:

- `mapOnly=1`
- `rain=1`
- `cleanup=1`
- `showFrameTime=1` (unless `lowPower=1`)
- `showTownNames=1`
- `interactive=1`
- `animate=1` (unless `lowPower=1` or explicitly disabled)

### What `lowPower` does

When `lowPower=1`:

- forces `animate=0`
- forces `showFrameTime=0`
- reduces frame overlay update frequency
- lowers cleanup retry work

Use this for lower CPU/GPU usage on weaker hardware.

### `animateMode` meanings

- `native`: leaves BOM's own timeline playback in control.
- `throttle`: pauses native playback and advances frames in fixed steps using `animateInterval` and `frameSkip`.

### `rain` and `cleanup`

- `rain=1`: forces rain/radar tab activation flow.
- `cleanup=1`: repeatedly removes upstream page chrome/overlays so only the map viewport remains.

These are already enabled by default on `/`.

## Place Lookup And Duplicate Town Names

Resolution order:

1. `path`
2. `place`
3. `coords`
4. built-in fallback (`australia/victoria/central/bvic_pt042-melbourne`)

If a place exists in multiple states, include state in `place`:

- `place=richmond,vic`
- `place=richmond,nsw`
- `place=burwood,vic`
- `place=burwood,nsw`

State values accepted in `place` suffix:

- short form: `act`, `nsw`, `nt`, `qld`, `sa`, `tas`, `vic`, `wa`
- full form: `victoria`, `new south wales`, etc.

## Example URLs

- `http://HOST:8083/?place=melbourne`
- `http://HOST:8083/?place=sydney&zoom=9`
- `http://HOST:8083/?place=richmond,vic&zoom=12&showFrameTime=1`
- `http://HOST:8083/?coords=-37.8136,144.9631&zoom=10`
- `http://HOST:8083/?path=australia/new-south-wales/metropolitan/bnsw_pt131-sydney&zoom=9`
- `http://HOST:8083/?place=melbourne&animate=1&animateMode=throttle&animateInterval=2500&frameSkip=1`

## Home Assistant Access

### Add-on network port

The add-on still exposes port `8083` by default:

- `http://HOME_ASSISTANT_HOST:8083/`
- `http://HOME_ASSISTANT_HOST:8083/health`
- `http://HOME_ASSISTANT_HOST:8083/test-harness`

### Home Assistant ingress and Home Assistant Cloud

The add-on now supports Home Assistant ingress. That is the correct route if you want it to behave like built-in sidebar apps such as VS Code.

- Open the add-on from the Home Assistant sidebar or add-on page.
- `Open Web UI` should open the ingress route, not the raw `:8083` port.
- The runtime and custom card also support the stable Home Assistant panel path `/app/13fa7b7e_bom_interactive_proxy`.
- The raw ingress endpoint under `/api/hassio_ingress/...` is what you want for iframe embedding if you do not want Home Assistant chrome inside the frame.
- If Home Assistant Cloud is enabled, ingress is the path that can be exposed through the Home Assistant UI.
- Ingress keeps the app under Home Assistant auth instead of exposing a separate raw port.

## BOM Interactive Proxy Card

In HACS and the Home Assistant card picker, this card is named `BOM Interactive Proxy Card`.
It is separate from `BOM Radar Card`.

Add the Lovelace resource:

```yaml
url: /app/13fa7b7e_bom_interactive_proxy/bom-interactive-proxy-card.js
type: module
```

Then add the card:

```yaml
type: custom:bom-interactive-proxy-card
place: melbourne
zoom: 9
```

The visual editor keeps a local draft while typing and only refreshes the preview after a field loses focus or a select changes.

If `base_path` is left blank, the card now resolves the live add-on ingress URL and prefers `/api/hassio_ingress/...`, which avoids the Home Assistant hamburger/header inside the iframe. If you explicitly set `base_path: /app/13fa7b7e_bom_interactive_proxy`, you are embedding the Home Assistant panel route and will see Home Assistant chrome.
If your add-on was installed from a fork or local repository with a different Home Assistant add-on ID, set `addon_slug` on the card so Supervisor lookup does not fall back to the panel route.

### `cloudflared` add-on

If you use the `cloudflared` add-on, expose either:

- Home Assistant itself, then access this add-on through Home Assistant ingress, or
- A dedicated public hostname that points to `http://HOME_ASSISTANT_HOST:8083`

Using ingress is the closer match to the VS Code add-on experience. Exposing port `8083` directly is still valid, but it is a separate app endpoint rather than a Home Assistant-native panel.

## Cache Management

- Cache path env: `NGINX_CACHE_PATH` (default `/tmp/nginx_cache`)
- Compose helpers: `CACHE_HOST_PATH` and `CACHE_CONTAINER_PATH`

Manual purge:

```bash
docker exec bom-interactive-proxy sh -lc 'rm -rf "${NGINX_CACHE_PATH:-/tmp/nginx_cache}/bom_tiles"/*'
docker restart bom-interactive-proxy
```

## Validation

```bash
./test.sh
```

Quick checks:

- `curl -f http://localhost:8083/health`
- Open `http://localhost:8083/?place=melbourne`
- Open `http://localhost:8083/?place=sydney&showTownNames=1&interactive=1`

## Additional Docs

- [INSTALL.md](INSTALL.md)
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- [bom_interactive_proxy/README.md](bom_interactive_proxy/README.md)
- [bom_interactive_proxy/DOCS.md](bom_interactive_proxy/DOCS.md)

Historical notes are kept in `archive/planning/`.
