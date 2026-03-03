# Changelog

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
