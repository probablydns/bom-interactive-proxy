# Troubleshooting

## Known-Good Release

- Verified working release: `1.0.64`
- Verified working access paths:
  - Home Assistant ingress / `Open Web UI`
  - direct raw port access on `:8083`

If behavior does not match that release, confirm the live version first before debugging anything else.

## Confirm The Live Version

Direct port:

```bash
curl -I http://HOST:8083/health
```

Ingress:

```bash
curl -I http://HOME_ASSISTANT_HOST:8123/api/hassio_ingress/TOKEN/
```

Look for:

- `X-BOM-Proxy-Version: 1.0.64`

If the header is older, you are still running an older build or cached add-on metadata.

## Home Assistant Still Shows An Older Add-On Version

1. Reload the add-on repositories in Home Assistant.
2. If it still shows the old version, restart Home Assistant.
3. If it still stays stale, remove and re-add the custom repository:
   `https://github.com/probablydns/bom-interactive-proxy`

## `Open Web UI` Opens `:8083` Instead Of Ingress

That means Home Assistant is still using old add-on metadata. Update to the latest add-on version and reload add-on repositories. On the working metadata, `Open Web UI` opens the ingress route under `/api/hassio_ingress/...`.

## Add-On Will Not Start

Check the add-on logs first. The most useful startup failures are Nginx config errors.

Examples:

- `invalid variable name`
- `sub_filter_once directive is duplicate`
- `configuration file /etc/nginx/nginx.conf test failed`

If you see one of those, the add-on did not boot cleanly and runtime behavior is not meaningful yet.

## Ingress Does Not Match Direct `:8083`

Working `1.0.64` behavior is:

- ingress loads the full map
- dragging works
- place names are visible
- radar animation runs

If direct `:8083` works but ingress does not:

1. Confirm the ingress page header is `X-BOM-Proxy-Version: 1.0.64`.
2. Confirm `Open Web UI` opens ingress, not the raw port.
3. Hard-refresh the ingress page after updating.

## Direct `:8083` Check

Useful direct test URL:

```text
http://HOST:8083/?place=ashburton&showFrameTime=1&animate=1&zoom=7&interactive=1
```

Useful ingress check:

```text
http://HOME_ASSISTANT_HOST:8123/app/13fa7b7e_bom_interactive_proxy
```

## Docker Checks

```bash
docker ps
docker logs bom-interactive-proxy --tail 100
curl http://localhost:8083/health
```

Correct port mapping is container `80` to host `8083`:

```bash
docker run -p 8083:80 ghcr.io/probablydns/bom-interactive-proxy:latest
```
