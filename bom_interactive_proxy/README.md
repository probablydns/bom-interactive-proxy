# BOM Interactive Proxy (Home Assistant App)

Run BOM Interactive Proxy inside Home Assistant as a custom App/Add-on.

Known-good release: `1.0.64`

Verified working in Home Assistant:

- ingress via `Open Web UI`
- direct raw port access on `:8083`

The app exposes:

- `/` full-screen radar map (default)
- `/map` direct map endpoint (advanced)
- `/map-only` legacy redirect to `/`
- `/test-harness` diagnostics page
- `/health` health check

Install from Home Assistant repository URL:

- `https://github.com/probablydns/bom-interactive-proxy`

For deployment methods, parameter reference, and `BOM Interactive Proxy Card` dashboard setup, see:

- [README.md](../README.md)
- [DOCS.md](./DOCS.md)
