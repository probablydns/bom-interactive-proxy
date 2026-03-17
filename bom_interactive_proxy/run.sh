#!/usr/bin/with-contenv sh
set -eu

: "${NGINX_CACHE_PATH:=/tmp/nginx_cache}"
: "${NGINX_CACHE_KEYS_ZONE_SIZE:=64m}"
: "${NGINX_CACHE_MAX_SIZE:=2g}"
: "${NGINX_CACHE_INACTIVE:=24h}"
: "${DISPLAY_TIMEZONE:=Australia/Melbourne}"

if command -v bashio >/dev/null 2>&1; then
  addon_display_timezone="$(bashio::config 'display_timezone' 2>/dev/null || true)"
  if [ -n "${addon_display_timezone}" ]; then
    DISPLAY_TIMEZONE="${addon_display_timezone}"
  fi
fi

mkdir -p "${NGINX_CACHE_PATH}" "${NGINX_CACHE_PATH}/bom_tiles" /run/nginx /var/log/nginx

if [ -f /etc/nginx/templates/nginx-cache.conf.template ]; then
  envsubst '${NGINX_CACHE_PATH} ${NGINX_CACHE_KEYS_ZONE_SIZE} ${NGINX_CACHE_MAX_SIZE} ${NGINX_CACHE_INACTIVE}' \
    < /etc/nginx/templates/nginx-cache.conf.template \
    > /etc/nginx/conf.d/nginx-cache.conf
fi

# Surface nginx logs in Home Assistant add-on logs.
ln -sf /dev/stdout /var/log/nginx/access.log
ln -sf /dev/stderr /var/log/nginx/error.log

escaped_timezone=$(printf '%s' "${DISPLAY_TIMEZONE}" | sed "s/'/\\\\'/g")
cat > /usr/share/nginx/html/app-config.js <<EOF
window.BOM_PROXY_CONFIG = Object.assign({}, window.BOM_PROXY_CONFIG || {}, {
  displayTimeZone: '${escaped_timezone}'
});
EOF

nginx -t
exec nginx -g "daemon off;"
