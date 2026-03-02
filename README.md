# BOM Interactive Proxy

Interactive BOM weather map proxy for local browser use, Home Assistant dashboards, and kiosk-style displays.

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
  -e TIMEZONE=Australia/Melbourne \
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
      - TIMEZONE=Australia/Melbourne
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
docker run -d --name bom-interactive-proxy -p 8083:80 -e TIMEZONE=Australia/Melbourne bom-interactive-proxy:local
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
| `showTownNames` | boolean | `0` | Enables town/city labels layer. |
| `interactive` | boolean | `0` | Enables drag/pan interactions. |
| `animate` | boolean | `0` | Enables timeline autoplay behavior. |
| `animateMode` | `native` or `throttle` | `native` | Animation strategy (see below). |
| `animateInterval` | integer ms (`500..30000`) | `2000` | Step interval used by `animateMode=throttle`. |
| `frameSkip` | integer (`1..6`) | `1` | Frames advanced per throttle step. |
| `lowPower` | boolean | `0` | Applies reduced-workload behavior (see below). |
| `cb` | string | none | Cache-bust token for client troubleshooting. |

Advanced/internal flags (usually not needed on `/`):

- `mapOnly=1` enables map-only behavior on `/map`.
- `rain=1` forces rain-tab workflow.
- `cleanup=1` forces repeated page chrome cleanup.

Timezone is fixed to `Australia/Melbourne` in the app. Query-string timezone override is not supported.

## Behavior Notes

### Root (`/`) defaults

`/` behaves like map-only mode by default and internally applies:

- `mapOnly=1`
- `rain=1`
- `cleanup=1`
- `showFrameTime=1` (unless `lowPower=1`)
- `animate=0` (unless explicitly set)

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

## Home Assistant Dashboard Card

### Built-in iframe card

```yaml
type: iframe
url: http://HOME_ASSISTANT_HOST:8083/?place=melbourne&showFrameTime=1&animate=1&animateMode=throttle&animateInterval=2500&frameSkip=1
aspect_ratio: 100%
```

### Custom card skeleton (`/config/www/bom-radar-card.js`)

```javascript
class BomRadarCard extends HTMLElement {
  setConfig(config) {
    this.config = {
      host: config.host || window.location.origin,
      place: config.place || "melbourne",
      zoom: Number.isFinite(Number(config.zoom)) ? Number(config.zoom) : 9,
      showFrameTime: config.show_frame_time !== false,
      animate: config.animate !== false,
      animateMode: config.animate_mode || "throttle",
      animateInterval: Number.isFinite(Number(config.animate_interval)) ? Number(config.animate_interval) : 2500,
      frameSkip: Number.isFinite(Number(config.frame_skip)) ? Number(config.frame_skip) : 1,
      interactive: config.interactive === true,
      height: config.height || "480px"
    };
    this.render();
  }

  render() {
    if (!this.config) return;
    const p = new URLSearchParams({
      place: this.config.place,
      zoom: String(this.config.zoom),
      showFrameTime: this.config.showFrameTime ? "1" : "0",
      animate: this.config.animate ? "1" : "0",
      animateMode: this.config.animateMode,
      animateInterval: String(this.config.animateInterval),
      frameSkip: String(this.config.frameSkip),
      interactive: this.config.interactive ? "1" : "0"
    });

    const src = `${this.config.host.replace(/\/$/, "")}/?${p.toString()}`;
    this.innerHTML = `<ha-card header="BOM Radar"><iframe src="${src}" style="width:100%;height:${this.config.height};border:0;"></iframe></ha-card>`;
  }

  getCardSize() {
    return 6;
  }
}

customElements.define("bom-radar-card", BomRadarCard);
```

Resource registration in Home Assistant:

1. **Settings -> Dashboards -> Resources -> Add Resource**
2. URL: `/local/bom-radar-card.js`
3. Type: `JavaScript Module`

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
