# Changelog

## 1.0.59

- Remove the `$`-bearing regex syntax from the ingress worker chunk loader rewrite so Nginx parses the `sub_filter` replacement cleanly, and normalize worker chunk URLs with plain string operations instead.
- Drop the duplicate `text/html` MIME entry from the ingress `sub_filter_types` list to suppress the startup warning.
- Refresh ingress cache markers to `20260320y`.

## 1.0.58

- Replace the worker-side `new URL(...)` chunk normalization with plain string-based resolution against the live worker script URL, so ingress worker chunk fetches no longer depend on URL constructor behavior inside the worker runtime.
- Refresh ingress cache markers to `20260320x`.

## 1.0.57

- Normalize ArcGIS worker chunk URLs against the live `RemoteClient.js` ingress URL before loading them, so credentialed chunk fetches no longer fail with `XMLHttpRequest.open(...): Invalid URL`.
- Refresh ingress cache markers to `20260320w`.

## 1.0.56

- Replace ArcGIS worker chunk loading inside ingress with a same-origin credentialed XHR path in `RemoteClient.js`, so worker chunk fetches no longer depend on `importScripts(...)` auth behavior under Home Assistant ingress.
- Refresh ingress cache markers to `20260320v`.

## 1.0.55

- Inject the corrected BOM asset root into `RemoteClient.js` itself so ArcGIS worker chunks resolve inside ingress, and use same-origin ingress paths for the page-side ESRI worker config.
- Prefer the live `showTownNames` URL/referrer flag over stale cookie state when deciding whether to keep town labels enabled.

## 1.0.63

- Inject the live ingress asset root into the local ArcGIS `RemoteClient.js` response and build worker chunk URLs from that explicit assets path instead of any blob or inferred public path.

## 1.0.62

- Resolve ArcGIS worker chunk URLs from the worker script location itself instead of webpack's derived public path, avoiding malformed ingress chunk URLs in `XMLHttpRequest.open(...)`.

## 1.0.61

- Replace the local ArcGIS worker chunk loader with a credentialed same-origin XHR path inside the bundled `RemoteClient.js`, so ingress workers can load secondary chunks without `importScripts(...)` auth failures.

## 1.0.60

- Serve a local pre-bundled ArcGIS `RemoteClient.js` under ingress so workers no longer depend on a second authenticated chunk bootstrap.
- Remove the brittle upstream `RemoteClient.js` response rewriting path and refresh cache-busters to `20260320z`.

## 1.0.54

- Fix ArcGIS worker chunk resolution under ingress by setting `esriConfig.assetsPath` to the actual BOM asset root instead of the nested `/assets/esri/` folder.
- Pass town-name overlay requests through by default and only suppress them when `bom_show_town_names=0` is explicitly set.

## 1.0.53

- Force ArcGIS worker configuration onto ingress-safe asset URLs before the BOM runtime boots, so worker imports no longer fall back to Home Assistant root paths.
- Turn town labels back on by default in map-only mode, so ingress restores place names unless `showTownNames=0` is explicitly requested.

## 1.0.52

- Make the add-on root entrypoint default to interactive and animated map-only mode, matching the working direct URL behavior without extra query params.
- Rewrite BOM theme and Drupal aggregate JavaScript asset-root strings so ArcGIS worker and weather-mood assets stay under the current ingress path.

## 1.0.51

- Stop rewriting embedded layer `url` fields to the ingress prefix in BOM HTML, so basemap and overlay paths remain compatible with BOM's `map_api` concatenation.
- Rewrite ingress runtime fetches for root `/themes|sites|modules|files|core|misc|profiles|libraries` assets and normalize malformed duplicated ingress mapping URLs.

## 1.0.50

- Canonicalize the iframe BOM page URL to `/location/...` before BOM boots under ingress, while preserving the ingress base separately for runtime API rewrites.

## 1.0.49

- Prefer the live `bom-spatial-map` section over the hidden Drupal placeholder when auto-scrolling to trigger BOM's lazy map mount, and refresh wrapper cache-busters to `20260320o`.

## 1.0.38

- Do not isolate or hide BOM's location placeholder until it contains real map content, and refresh the wrapper cache-buster to `20260320g`.

## 1.0.37

- Use BOM's `#drupal-location-placeholder` as the ingress map-host fallback, and refresh the wrapper cache-buster to `20260320f`.

## 1.0.36

- Prefer the outer ESRI viewport container when isolating the map, add a delayed fallback to BOM's map host container under ingress, and refresh the wrapper cache-buster to `20260320e`.

## 1.0.35

- Do not apply map-only CSS until a real map viewport exists, so ingress no longer traps the BOM page in a non-scrollable warnings layout while the map is still booting.
- Broaden strict map-root detection to include `.esri-view`, and refresh the wrapper cache-buster to `20260320d`.

## 1.0.34

- In map-only mode, wait for a real map viewport such as `.esri-view-root` before isolating the BOM page, instead of isolating the early `bom-spatial-map` placeholder.
- Leave the BOM document layout intact until a real map root exists, and refresh the wrapper cache-buster to `20260320c`.

## 1.0.33

- Rewrite BOM map service URLs inside parsed ingress runtime config so `/timeseries`, `/overlays`, `/basemaps`, `/apikey` and related paths stay under the current ingress token before the React map boots.
- Rewrite embedded JSON endpoint strings in proxied BOM HTML for ingress, and refresh cache-busters to `20260320b`.

## 1.0.32

- Inject a real inline global `elasticApm` stub into proxied BOM HTML before BOM footer scripts run, so ingress pages cannot crash on `elasticApm.init(...)`.
- Refresh ingress cache-busters to `20260320a`.

## 1.0.31

- Export the BOM RUM stub as a real global `elasticApm` symbol so BOM footer code can call `elasticApm.init(...)` without crashing.
- Make the local `elastic-apm-rum` stub non-cached and refresh ingress cache-busters to `20260319r5`.

## 1.0.30

- Disable BOM RUM/APM under the proxy by stubbing the local `elastic-apm-rum` script and short-circuiting APM fetch/XHR/beacon calls in the injected runtime.
- Skip service worker registration under Home Assistant ingress to reduce ingress-only embed failures.
- Refresh ingress cache-busters to `20260319r4`.

## 1.0.29

- Fix ingress base-path detection when Home Assistant serves the add-on at `/api/hassio_ingress/<token>` without a trailing slash.
- Refresh ingress cache-busters to `20260319r3`.

## 1.0.28

- Enable Home Assistant ingress in add-on metadata and remove the raw `webui` override so `Open Web UI` uses ingress instead of `:8083`.

## 1.0.27

- Fix wrapper-side ingress requests that were still escaping to Home Assistant root for place lookup, WMTS metadata, town overlays, and service worker registration.
- Refresh ingress cache-busters to `20260319r2`.

## 1.0.26

- Reset the ingress implementation onto the stable `79a9112` wrapper baseline.
- Make the wrapper and runtime asset/API overrides ingress-aware without changing the known-good direct map behavior.
- Add dedicated BOM CSS rewrites for Drupal aggregate CSS and BOM theme chunk CSS so fonts and SVG assets stay inside ingress.
- Return a local `app-config.js` shim for stale clients that still request it through ingress.

## 1.0.4

- Add custom Home Assistant add-on artwork (`icon.png` and `logo.png`) with weather-radar styling.

## 1.0.3

- Fix Home Assistant add-on Docker build error by declaring `ARG BUILD_FROM` before all `FROM` instructions.

## 1.0.2

- Fix Home Assistant add-on startup loop by adding an explicit `run.sh` entrypoint.
- Build from HA add-on base and run nginx under s6 instead of relying on a passive image-only Dockerfile.
- Remove invalid `build_from` key from `config.yaml` and keep add-on metadata schema-compliant.

## 1.0.1

- Fix Home Assistant add-on build base image selection via explicit `build_from`.
- Restrict add-on architecture list to images published in GHCR (`amd64`, `aarch64`).

## 1.0.0

- Initial Home Assistant App/Add-on packaging for BOM Interactive Proxy.
- Runs existing `ghcr.io/probablydns/bom-interactive-proxy:latest`.
