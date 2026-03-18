#!/bin/sh
set -eu

: "${NGINX_CACHE_PATH:=/tmp/nginx_cache}"
: "${DISPLAY_TIMEZONE:=Australia/Melbourne}"

mkdir -p "${NGINX_CACHE_PATH}" "${NGINX_CACHE_PATH}/bom_tiles"

escaped_timezone=$(printf '%s' "${DISPLAY_TIMEZONE}" | sed "s/'/\\\\'/g")
sed -i "s|__DISPLAY_TIMEZONE__|${escaped_timezone}|g" /usr/share/nginx/html/map.html
cat > /usr/share/nginx/html/app-config.js <<EOF
window.BOM_PROXY_CONFIG = Object.assign(
  { displayTimeZone: '${escaped_timezone}' },
  window.BOM_PROXY_CONFIG || {}
);
EOF
