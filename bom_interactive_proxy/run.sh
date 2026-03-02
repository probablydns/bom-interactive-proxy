#!/usr/bin/with-contenv sh
set -eu

: "${NGINX_CACHE_PATH:=/tmp/nginx_cache}"
: "${NGINX_CACHE_KEYS_ZONE_SIZE:=64m}"
: "${NGINX_CACHE_MAX_SIZE:=2g}"
: "${NGINX_CACHE_INACTIVE:=24h}"

mkdir -p "${NGINX_CACHE_PATH}" "${NGINX_CACHE_PATH}/bom_tiles" /run/nginx /var/log/nginx

if [ -f /etc/nginx/templates/nginx-cache.conf.template ]; then
  envsubst '${NGINX_CACHE_PATH} ${NGINX_CACHE_KEYS_ZONE_SIZE} ${NGINX_CACHE_MAX_SIZE} ${NGINX_CACHE_INACTIVE}' \
    < /etc/nginx/templates/nginx-cache.conf.template \
    > /etc/nginx/conf.d/nginx-cache.conf
fi

# Surface nginx logs in Home Assistant add-on logs.
ln -sf /dev/stdout /var/log/nginx/access.log
ln -sf /dev/stderr /var/log/nginx/error.log

nginx -t
exec nginx -g "daemon off;"
