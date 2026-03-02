# Installation Guide

This guide covers Home Assistant and Docker deployment for BOM Interactive Proxy.

## Home Assistant App/Add-on

1. Open **Settings -> Add-ons (Apps) -> Add-on Store**.
2. Open the top-right menu -> **Repositories**.
3. Add repository URL: `https://github.com/probablydns/bom-interactive-proxy`.
4. Install **BOM Interactive Proxy**.
5. Start the app.

Default URLs:

- `http://HOME_ASSISTANT_HOST:8083/`
- `http://HOME_ASSISTANT_HOST:8083/health`
- `http://HOME_ASSISTANT_HOST:8083/test-harness`

## Docker Deployment

### Method 1: Prebuilt image (`docker run`)

```bash
docker run -d \
  --name bom-interactive-proxy \
  -p 8083:80 \
  -e TIMEZONE=Australia/Melbourne \
  -e NGINX_CACHE_PATH=/var/cache/bom \
  -v /your/host/cache/path:/var/cache/bom \
  --restart unless-stopped \
  ghcr.io/probablydns/bom-interactive-proxy:latest
```

### Method 2: Docker Compose

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

### Method 3: Build locally

```bash
git clone https://github.com/probablydns/bom-interactive-proxy.git
cd bom-interactive-proxy
docker build -t bom-interactive-proxy:local .
docker rm -f bom-interactive-proxy 2>/dev/null || true
docker run -d --name bom-interactive-proxy -p 8083:80 -e TIMEZONE=Australia/Melbourne bom-interactive-proxy:local
```

## Verify Service

```bash
curl -f http://localhost:8083/health
```

## Test URLs

- `http://HOST:8083/?place=melbourne`
- `http://HOST:8083/?place=sydney&zoom=9&showFrameTime=1`
- `http://HOST:8083/?place=melbourne&animate=1&animateMode=throttle&animateInterval=2500&frameSkip=1`
- `http://HOST:8083/?coords=-37.8136,144.9631&zoom=10`
- `http://HOST:8083/?path=australia/new-south-wales/metropolitan/bnsw_pt131-sydney&zoom=9`
- `http://HOST:8083/?place=richmond,vic&zoom=12`

## Home Assistant Dashboard Card

### Built-in iframe card

```yaml
type: iframe
url: http://HOME_ASSISTANT_HOST:8083/?place=melbourne&showFrameTime=1&animate=1&animateMode=throttle&animateInterval=2500&frameSkip=1
aspect_ratio: 100%
```

For a custom card implementation, use the root `README.md` section **Home Assistant Dashboard Card**.

## Notes

- `/map-only` is a legacy redirect; use `/` in new links.
- Timezone query overrides are not supported. Set timezone with container/app environment (`TIMEZONE`).
- If port `8083` is in use, change host port mapping.
- For full parameter behavior (including `lowPower`, `rain`, and `cleanup`), see `README.md`.
