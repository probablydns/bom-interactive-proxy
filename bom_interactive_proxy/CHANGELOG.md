# Changelog

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
