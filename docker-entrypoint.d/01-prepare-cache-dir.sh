#!/bin/sh
set -eu

: "${NGINX_CACHE_PATH:=/tmp/nginx_cache}"
: "${DISPLAY_TIMEZONE:=Australia/Melbourne}"

mkdir -p "${NGINX_CACHE_PATH}" "${NGINX_CACHE_PATH}/bom_tiles"

escaped_timezone=$(printf '%s' "${DISPLAY_TIMEZONE}" | sed "s/'/\\\\'/g")
cat > /usr/share/nginx/html/app-config.js <<EOF
window.BOM_PROXY_CONFIG = Object.assign({}, window.BOM_PROXY_CONFIG || {}, {
  displayTimeZone: '${escaped_timezone}'
});
EOF
